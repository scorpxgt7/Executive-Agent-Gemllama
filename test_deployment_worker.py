#!/usr/bin/env python3
"""
Test script for deployment worker functionality
"""
import asyncio
import tempfile
import os
from workers.deployment.worker import DeploymentWorker

async def test_deployment_worker():
    """Test deployment worker operations"""
    worker = DeploymentWorker()
    await worker.initialize()

    try:
        # Test 1: Run allowed command
        cmd_result = await worker.execute_task({
            "action": "run_command",
            "parameters": {
                "command": "echo 'Hello from deployment worker'",
                "timeout": 10
            }
        })
        print(f"Run command result: {cmd_result}")

        # Test 2: Try forbidden command
        forbidden_result = await worker.execute_task({
            "action": "run_command",
            "parameters": {
                "command": "rm -rf /",
                "timeout": 10
            }
        })
        print(f"Forbidden command result: {forbidden_result}")

        # Test 3: Package install (pip)
        pip_result = await worker.execute_task({
            "action": "package_install",
            "parameters": {
                "package_manager": "pip",
                "packages": ["requests"],
                "global": False
            }
        })
        print(f"Pip install result: {pip_result}")

        # Test 4: Git clone (if git available)
        with tempfile.TemporaryDirectory() as temp_dir:
            git_result = await worker.execute_task({
                "action": "git_operation",
                "parameters": {
                    "operation": "clone",
                    "repo_path": os.path.join(temp_dir, "test-repo"),
                    "remote_url": "https://github.com/octocat/Hello-World.git"
                }
            })
            print(f"Git clone result: {git_result}")

        # Test 5: Docker compose (if docker available)
        compose_result = await worker.execute_task({
            "action": "docker_compose",
            "parameters": {
                "operation": "ps",
                "compose_file": "docker-compose.yml"
            }
        })
        print(f"Docker compose result: {compose_result}")

    finally:
        await worker.cleanup()

    print("Deployment worker tests completed!")

if __name__ == "__main__":
    asyncio.run(test_deployment_worker())
