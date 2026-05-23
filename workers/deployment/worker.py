from typing import Dict, Any, List
import structlog
import subprocess
import asyncio
import os
import json
from pathlib import Path
from datetime import datetime
import docker
import git

logger = structlog.get_logger()

class DeploymentWorker:
    def __init__(self):
        self.allowed_commands = [
            "git", "docker", "docker-compose", "kubectl", "helm",
            "npm", "yarn", "pip", "python", "node", "echo", "ls", "pwd",
            "mkdir", "cp", "mv", "rm", "cat", "grep", "find", "which"
        ]
        self.docker_client = None

    async def initialize(self):
        """Initialize deployment worker"""
        try:
            self.docker_client = docker.from_env()
        except Exception as e:
            logger.warning("Docker client initialization failed", error=str(e))

    async def cleanup(self):
        """Cleanup resources"""
        if self.docker_client:
            self.docker_client.close()

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute deployment task"""
        action = task_data.get("action", "")
        parameters = task_data.get("parameters", {})

        try:
            if action == "git_operation":
                return await self._git_operation(parameters)
            elif action == "docker_build":
                return await self._docker_build(parameters)
            elif action == "docker_run":
                return await self._docker_run(parameters)
            elif action == "docker_compose":
                return await self._docker_compose(parameters)
            elif action == "run_command":
                return await self._run_command(parameters)
            elif action == "deploy_kubernetes":
                return await self._deploy_kubernetes(parameters)
            elif action == "package_install":
                return await self._package_install(parameters)
            else:
                return {"status": "error", "message": f"Unknown action: {action}"}

        except Exception as e:
            logger.error("Deployment task failed", error=str(e), task=task_data)
            return {"status": "failed", "error": str(e)}

    async def _git_operation(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute git operations"""
        operation = params.get("operation", "")
        repo_path = params.get("repo_path", "")
        remote_url = params.get("remote_url", "")
        branch = params.get("branch", "main")

        if not repo_path:
            return {"status": "error", "message": "Repository path required"}

        try:
            if operation == "clone":
                if not remote_url:
                    return {"status": "error", "message": "Remote URL required for clone"}
                result = subprocess.run(
                    ["git", "clone", remote_url, repo_path],
                    capture_output=True, text=True, timeout=300
                )
                return {
                    "status": "success" if result.returncode == 0 else "failed",
                    "action": "git_clone",
                    "repo_path": repo_path,
                    "remote_url": remote_url,
                    "output": result.stdout,
                    "error": result.stderr,
                    "timestamp": datetime.utcnow().isoformat()
                }

            elif operation == "pull":
                os.chdir(repo_path)
                result = subprocess.run(
                    ["git", "pull", "origin", branch],
                    capture_output=True, text=True, timeout=120
                )
                return {
                    "status": "success" if result.returncode == 0 else "failed",
                    "action": "git_pull",
                    "repo_path": repo_path,
                    "branch": branch,
                    "output": result.stdout,
                    "error": result.stderr,
                    "timestamp": datetime.utcnow().isoformat()
                }

            elif operation == "push":
                os.chdir(repo_path)
                result = subprocess.run(
                    ["git", "push", "origin", branch],
                    capture_output=True, text=True, timeout=120
                )
                return {
                    "status": "success" if result.returncode == 0 else "failed",
                    "action": "git_push",
                    "repo_path": repo_path,
                    "branch": branch,
                    "output": result.stdout,
                    "error": result.stderr,
                    "timestamp": datetime.utcnow().isoformat()
                }

            elif operation == "commit":
                os.chdir(repo_path)
                message = params.get("message", "Automated commit")
                result = subprocess.run(
                    ["git", "add", "."],
                    capture_output=True, text=True, timeout=60
                )
                if result.returncode != 0:
                    return {"status": "failed", "error": result.stderr}

                result = subprocess.run(
                    ["git", "commit", "-m", message],
                    capture_output=True, text=True, timeout=60
                )
                return {
                    "status": "success" if result.returncode == 0 else "failed",
                    "action": "git_commit",
                    "repo_path": repo_path,
                    "message": message,
                    "output": result.stdout,
                    "error": result.stderr,
                    "timestamp": datetime.utcnow().isoformat()
                }

            else:
                return {"status": "error", "message": f"Unknown git operation: {operation}"}

        except subprocess.TimeoutExpired:
            return {"status": "failed", "error": "Git operation timed out"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _docker_build(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Build Docker image"""
        if not self.docker_client:
            return {"status": "error", "message": "Docker client not available"}

        dockerfile_path = params.get("dockerfile_path", ".")
        image_tag = params.get("image_tag", "latest")
        build_context = params.get("build_context", ".")

        try:
            image, build_logs = self.docker_client.images.build(
                path=build_context,
                dockerfile=dockerfile_path,
                tag=image_tag,
                rm=True
            )

            logs = [log.get('stream', '') for log in build_logs if log.get('stream')]

            return {
                "status": "success",
                "action": "docker_build",
                "image_tag": image_tag,
                "build_context": build_context,
                "dockerfile_path": dockerfile_path,
                "image_id": image.id,
                "logs": "".join(logs),
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _docker_run(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Run Docker container"""
        if not self.docker_client:
            return {"status": "error", "message": "Docker client not available"}

        image = params.get("image", "")
        command = params.get("command", [])
        environment = params.get("environment", {})
        ports = params.get("ports", {})
        volumes = params.get("volumes", {})
        detach = params.get("detach", True)
        name = params.get("name", "")

        if not image:
            return {"status": "error", "message": "Image name required"}

        try:
            container = self.docker_client.containers.run(
                image=image,
                command=command,
                environment=environment,
                ports=ports,
                volumes=volumes,
                detach=detach,
                name=name if name else None
            )

            return {
                "status": "success",
                "action": "docker_run",
                "image": image,
                "container_id": container.id,
                "container_name": container.name,
                "command": command,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _docker_compose(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute docker-compose operations"""
        operation = params.get("operation", "")
        compose_file = params.get("compose_file", "docker-compose.yml")
        project_name = params.get("project_name", "")

        if operation not in ["up", "down", "build", "start", "stop", "restart", "ps", "logs"]:
            return {"status": "error", "message": f"Invalid operation: {operation}"}

        try:
            cmd = ["docker-compose", "-f", compose_file]
            if project_name:
                cmd.extend(["-p", project_name])
            cmd.append(operation)

            if operation == "up":
                cmd.append("-d")  # Run in background

            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=300
            )

            return {
                "status": "success" if result.returncode == 0 else "failed",
                "action": "docker_compose",
                "operation": operation,
                "compose_file": compose_file,
                "project_name": project_name,
                "output": result.stdout,
                "error": result.stderr,
                "timestamp": datetime.utcnow().isoformat()
            }

        except subprocess.TimeoutExpired:
            return {"status": "failed", "error": "Docker compose operation timed out"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _run_command(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Run arbitrary shell command"""
        command = params.get("command", "")
        cwd = params.get("cwd", ".")
        timeout = params.get("timeout", 60)

        if not command:
            return {"status": "error", "message": "Command required"}

        # Security check - only allow whitelisted commands
        cmd_parts = command.split()
        if cmd_parts and cmd_parts[0] not in self.allowed_commands:
            return {"status": "error", "message": f"Command not allowed: {cmd_parts[0]}"}

        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=cwd,
                timeout=timeout
            )

            return {
                "status": "success" if result.returncode == 0 else "failed",
                "action": "run_command",
                "command": command,
                "cwd": cwd,
                "return_code": result.returncode,
                "output": result.stdout,
                "error": result.stderr,
                "timestamp": datetime.utcnow().isoformat()
            }

        except subprocess.TimeoutExpired:
            return {"status": "failed", "error": "Command timed out"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _deploy_kubernetes(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Deploy to Kubernetes"""
        operation = params.get("operation", "")
        manifest_file = params.get("manifest_file", "")
        namespace = params.get("namespace", "default")

        if operation not in ["apply", "delete", "create"]:
            return {"status": "error", "message": f"Invalid operation: {operation}"}

        try:
            cmd = ["kubectl", operation, "-f", manifest_file]
            if namespace != "default":
                cmd.extend(["-n", namespace])

            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=120
            )

            return {
                "status": "success" if result.returncode == 0 else "failed",
                "action": "deploy_kubernetes",
                "operation": operation,
                "manifest_file": manifest_file,
                "namespace": namespace,
                "output": result.stdout,
                "error": result.stderr,
                "timestamp": datetime.utcnow().isoformat()
            }

        except subprocess.TimeoutExpired:
            return {"status": "failed", "error": "Kubernetes operation timed out"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _package_install(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Install packages using various package managers"""
        package_manager = params.get("package_manager", "")
        packages = params.get("packages", [])
        global_install = params.get("global", False)

        if not packages:
            return {"status": "error", "message": "Package list required"}

        try:
            if package_manager == "pip":
                cmd = ["pip", "install"]
                if not global_install:
                    cmd.append("--user")
                cmd.extend(packages)

            elif package_manager == "npm":
                cmd = ["npm", "install"]
                if global_install:
                    cmd.append("-g")
                cmd.extend(packages)

            elif package_manager == "yarn":
                cmd = ["yarn", "add"]
                if global_install:
                    cmd.append("global")
                cmd.extend(packages)

            elif package_manager == "apt":
                cmd = ["apt", "update", "&&", "apt", "install", "-y"] + packages

            else:
                return {"status": "error", "message": f"Unsupported package manager: {package_manager}"}

            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=300
            )

            return {
                "status": "success" if result.returncode == 0 else "failed",
                "action": "package_install",
                "package_manager": package_manager,
                "packages": packages,
                "global": global_install,
                "output": result.stdout,
                "error": result.stderr,
                "timestamp": datetime.utcnow().isoformat()
            }

        except subprocess.TimeoutExpired:
            return {"status": "failed", "error": "Package installation timed out"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}
