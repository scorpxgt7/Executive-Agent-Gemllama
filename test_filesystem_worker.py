#!/usr/bin/env python3
"""
Test script for filesystem worker functionality
"""
import asyncio
import tempfile
import os
from pathlib import Path
from workers.filesystem.worker import FilesystemWorker

async def test_filesystem_worker():
    """Test filesystem worker operations"""
    worker = FilesystemWorker()

    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Testing in temporary directory: {temp_dir}")

        # Test 1: Write file
        test_file = os.path.join(temp_dir, "test.txt")
        write_result = await worker.execute_task({
            "action": "write_file",
            "path": test_file,
            "parameters": {
                "content": "Hello, World!\nThis is a test file.",
                "encoding": "utf-8"
            }
        })
        print(f"Write file result: {write_result}")

        # Test 2: Read file
        read_result = await worker.execute_task({
            "action": "read_file",
            "path": test_file,
            "parameters": {
                "encoding": "utf-8"
            }
        })
        print(f"Read file result: {read_result}")

        # Test 3: Create directory
        test_dir = os.path.join(temp_dir, "test_subdir")
        mkdir_result = await worker.execute_task({
            "action": "create_directory",
            "path": test_dir,
            "parameters": {}
        })
        print(f"Create directory result: {mkdir_result}")

        # Test 4: List directory
        list_result = await worker.execute_task({
            "action": "list_directory",
            "path": temp_dir,
            "parameters": {}
        })
        print(f"List directory result: {list_result}")

        # Test 5: Copy file
        copy_file = os.path.join(temp_dir, "test_copy.txt")
        copy_result = await worker.execute_task({
            "action": "copy",
            "path": test_file,
            "parameters": {
                "destination": copy_file
            }
        })
        print(f"Copy file result: {copy_result}")

        # Test 6: Search files
        search_result = await worker.execute_task({
            "action": "search",
            "path": temp_dir,
            "parameters": {
                "query": "Hello",
                "file_types": ["txt"]
            }
        })
        print(f"Search files result: {search_result}")

        # Test 7: Move file
        move_file = os.path.join(test_dir, "moved.txt")
        move_result = await worker.execute_task({
            "action": "move",
            "path": copy_file,
            "parameters": {
                "destination": move_file
            }
        })
        print(f"Move file result: {move_result}")

        # Test 8: Delete file
        delete_result = await worker.execute_task({
            "action": "delete",
            "path": move_file,
            "parameters": {}
        })
        print(f"Delete file result: {delete_result}")

        # Test 9: Security check - try to access forbidden path
        forbidden_result = await worker.execute_task({
            "action": "read_file",
            "path": "/etc/passwd",
            "parameters": {}
        })
        print(f"Forbidden path result: {forbidden_result}")

    print("Filesystem worker tests completed!")

if __name__ == "__main__":
    asyncio.run(test_filesystem_worker())
