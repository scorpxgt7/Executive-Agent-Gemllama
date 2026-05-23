from typing import Dict, Any, List
import structlog
import aiofiles
import os
import shutil
import json
import csv
from pathlib import Path
from datetime import datetime

logger = structlog.get_logger()

class FilesystemWorker:
    def __init__(self):
        self.allowed_paths = ["/tmp", "/workspaces", "/app"]  # Configurable safe paths

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute filesystem task"""
        action = task_data.get("action", "")
        path = task_data.get("path", "")
        parameters = task_data.get("parameters", {})

        try:
            # Security check
            if not self._is_path_allowed(path):
                return {"status": "error", "message": f"Path not allowed: {path}"}

            if action == "read_file":
                return await self._read_file(path, parameters)
            elif action == "write_file":
                return await self._write_file(path, parameters)
            elif action == "list_directory":
                return await self._list_directory(path, parameters)
            elif action == "create_directory":
                return await self._create_directory(path, parameters)
            elif action == "delete":
                return await self._delete(path, parameters)
            elif action == "move":
                return await self._move(path, parameters)
            elif action == "copy":
                return await self._copy(path, parameters)
            elif action == "search":
                return await self._search_files(path, parameters)
            else:
                return {"status": "error", "message": f"Unknown action: {action}"}

        except Exception as e:
            logger.error("Filesystem task failed", error=str(e), task=task_data)
            return {"status": "failed", "error": str(e)}

    def _is_path_allowed(self, path: str) -> bool:
        """Check if path is within allowed directories"""
        if not path:
            return False

        abs_path = os.path.abspath(path)
        return any(abs_path.startswith(allowed) for allowed in self.allowed_paths)

    async def _read_file(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Read file content"""
        encoding = params.get("encoding", "utf-8")
        max_size = params.get("max_size", 1024 * 1024)  # 1MB default

        if not os.path.exists(path):
            return {"status": "error", "message": "File not found"}

        file_size = os.path.getsize(path)
        if file_size > max_size:
            return {"status": "error", "message": f"File too large: {file_size} bytes"}

        async with aiofiles.open(path, 'r', encoding=encoding) as f:
            content = await f.read()

        return {
            "status": "success",
            "action": "read_file",
            "path": path,
            "size": file_size,
            "encoding": encoding,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _write_file(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Write content to file"""
        content = params.get("content", "")
        encoding = params.get("encoding", "utf-8")
        mode = params.get("mode", "w")  # w, a, etc.

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(path), exist_ok=True)

        async with aiofiles.open(path, mode, encoding=encoding) as f:
            await f.write(content)

        return {
            "status": "success",
            "action": "write_file",
            "path": path,
            "size": len(content),
            "encoding": encoding,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _list_directory(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """List directory contents"""
        if not os.path.exists(path):
            return {"status": "error", "message": "Directory not found"}

        if not os.path.isdir(path):
            return {"status": "error", "message": "Path is not a directory"}

        pattern = params.get("pattern", "*")
        recursive = params.get("recursive", False)

        items = []
        if recursive:
            for root, dirs, files in os.walk(path):
                for item in dirs + files:
                    full_path = os.path.join(root, item)
                    if pattern == "*" or pattern in item:
                        items.append({
                            "name": item,
                            "path": full_path,
                            "type": "directory" if os.path.isdir(full_path) else "file",
                            "size": os.path.getsize(full_path) if os.path.isfile(full_path) else 0
                        })
        else:
            for item in os.listdir(path):
                full_path = os.path.join(path, item)
                if pattern == "*" or pattern in item:
                    items.append({
                        "name": item,
                        "path": full_path,
                        "type": "directory" if os.path.isdir(full_path) else "file",
                        "size": os.path.getsize(full_path) if os.path.isfile(full_path) else 0
                    })

        return {
            "status": "success",
            "action": "list_directory",
            "path": path,
            "pattern": pattern,
            "recursive": recursive,
            "items": items,
            "count": len(items),
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _create_directory(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create directory"""
        parents = params.get("parents", True)
        exist_ok = params.get("exist_ok", True)

        os.makedirs(path, exist_ok=exist_ok)

        return {
            "status": "success",
            "action": "create_directory",
            "path": path,
            "parents": parents,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _delete(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Delete file or directory"""
        recursive = params.get("recursive", False)

        if not os.path.exists(path):
            return {"status": "error", "message": "Path not found"}

        if os.path.isdir(path):
            if recursive:
                shutil.rmtree(path)
            else:
                os.rmdir(path)
        else:
            os.remove(path)

        return {
            "status": "success",
            "action": "delete",
            "path": path,
            "recursive": recursive,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _move(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Move file or directory"""
        destination = params.get("destination", "")

        if not self._is_path_allowed(destination):
            return {"status": "error", "message": f"Destination not allowed: {destination}"}

        shutil.move(path, destination)

        return {
            "status": "success",
            "action": "move",
            "from": path,
            "to": destination,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _copy(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Copy file or directory"""
        destination = params.get("destination", "")

        if not self._is_path_allowed(destination):
            return {"status": "error", "message": f"Destination not allowed: {destination}"}

        if os.path.isdir(path):
            shutil.copytree(path, destination)
        else:
            shutil.copy2(path, destination)

        return {
            "status": "success",
            "action": "copy",
            "from": path,
            "to": destination,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _search_files(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search for files matching criteria"""
        query = params.get("query", "")
        file_types = params.get("file_types", [])
        max_results = params.get("max_results", 100)

        results = []
        for root, dirs, files in os.walk(path):
            for file in files:
                if len(results) >= max_results:
                    break

                full_path = os.path.join(root, file)

                # Check file type filter
                if file_types:
                    ext = os.path.splitext(file)[1].lower()
                    if ext not in [f".{ft.lower()}" for ft in file_types]:
                        continue

                # Check content search
                if query:
                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            if query.lower() not in content.lower():
                                continue
                    except:
                        continue

                results.append({
                    "name": file,
                    "path": full_path,
                    "size": os.path.getsize(full_path),
                    "modified": datetime.fromtimestamp(os.path.getmtime(full_path)).isoformat()
                })

        return {
            "status": "success",
            "action": "search",
            "path": path,
            "query": query,
            "file_types": file_types,
            "results": results,
            "count": len(results),
            "timestamp": datetime.utcnow().isoformat()
        }
