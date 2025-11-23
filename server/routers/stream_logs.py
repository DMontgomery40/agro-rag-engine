"""
SSE Log Streaming for Terminal Components
Real-time log streaming for build operations, Docker, and more
"""
import asyncio
import json
import os
import sys
import subprocess
import time
from typing import AsyncGenerator, Optional
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from common.paths import repo_root

router = APIRouter()

async def stream_build_logs(
    build_type: str,
    repo: str,
    request: Request
) -> AsyncGenerator[str, None]:
    """Stream build logs via SSE"""

    # Example: Stream actual build process
    if build_type == "cards":
        # Start actual cards build process
        process = subprocess.Popen(
            ["python", "-m", "indexer.build_cards", "--repo", repo],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            universal_newlines=True
        )

        start_time = time.time()
        line_count = 0

        # Stream real output
        for line in iter(process.stdout.readline, ''):
            if await request.is_disconnected():
                process.terminate()
                break

            line_count += 1
            elapsed = time.time() - start_time

            # Parse progress from certain log patterns
            progress = 0
            message = line.strip()

            if "Scanning" in line:
                progress = 10
                message = "Scanning repository files..."
            elif "Chunking" in line:
                progress = 30
                message = "Creating code chunks..."
            elif "Summarizing" in line:
                progress = 50
                message = "Generating AI summaries..."
            elif "Embedding" in line:
                progress = 70
                message = "Creating embeddings..."
            elif "Writing" in line:
                progress = 90
                message = "Writing to database..."
            elif "Complete" in line:
                progress = 100
                message = "Build complete!"

            # Send log line
            yield f"data: {json.dumps({'type': 'log', 'message': line.strip()})}\n\n"

            # Send progress update if we detected progress
            if progress > 0:
                yield f"data: {json.dumps({'type': 'progress', 'percent': progress, 'message': message})}\n\n"

            await asyncio.sleep(0.01)  # Small delay to prevent overwhelming

        # Wait for process to complete
        process.wait()

        if process.returncode == 0:
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Build failed with code {process.returncode}'})}\n\n"

@router.get("/api/stream/builds/{build_type}")
async def stream_build(
    build_type: str,
    repo: str,
    request: Request
):
    """
    Stream build logs via Server-Sent Events

    Example:
    GET /api/stream/builds/cards?repo=my-repo

    Returns SSE stream with:
    - type: 'log' - Log lines
    - type: 'progress' - Progress updates (percent, message)
    - type: 'error' - Error messages
    - type: 'complete' - Build completed
    """
    return StreamingResponse(
        stream_build_logs(build_type, repo, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        }
    )

@router.get("/api/stream/docker/logs/{container}")
async def stream_docker_logs(
    container: str,
    request: Request
):
    """Stream Docker container logs in real-time"""

    async def generate():
        process = subprocess.Popen(
            ["docker", "logs", "-f", "--tail", "100", container],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            universal_newlines=True
        )

        for line in iter(process.stdout.readline, ''):
            if await request.is_disconnected():
                process.terminate()
                break

            # Color-code based on log level
            if "ERROR" in line or "FATAL" in line:
                line = f"\x1b[31m{line}\x1b[0m"  # Red
            elif "WARN" in line:
                line = f"\x1b[33m{line}\x1b[0m"  # Yellow
            elif "INFO" in line:
                line = f"\x1b[34m{line}\x1b[0m"  # Blue
            elif "SUCCESS" in line or "✓" in line:
                line = f"\x1b[32m{line}\x1b[0m"  # Green

            yield f"data: {json.dumps({'type': 'log', 'message': line.strip()})}\n\n"
            await asyncio.sleep(0.01)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@router.get("/api/stream/operations/{operation}")
async def stream_operation(
    operation: str,
    request: Request
):
    """Stream logs for various operations"""

    async def generate():
        # Map operations to actual commands
        commands = {
            "index": ["python", "-m", "indexer.index_repo"],
            "eval": ["python", "-m", "eval.eval_loop"],
            "train": ["python", "-m", "reranker.train"],
        }

        if operation not in commands:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Unknown operation: {operation}'})}\n\n"
            return

        cmd = commands[operation]
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            universal_newlines=True
        )

        for line in iter(process.stdout.readline, ''):
            if await request.is_disconnected():
                process.terminate()
                break

            yield f"data: {json.dumps({'type': 'log', 'message': line.strip()})}\n\n"
            await asyncio.sleep(0.01)

        process.wait()

        if process.returncode == 0:
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Operation failed with code {process.returncode}'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


async def stream_index_run(
    repo: Optional[str],
    skip_dense: int,
    enrich: int,
    request: Request
) -> AsyncGenerator[str, None]:
    """Stream indexer run stdout as SSE logs."""
    env = {**os.environ, "REPO_ROOT": str(repo_root())}
    if repo:
        env["REPO"] = repo
    if skip_dense:
        env["SKIP_DENSE"] = "1"
    if enrich:
        env["ENRICH_CODE_CHUNKS"] = "true"

    cmd = [sys.executable, "-m", "indexer.index_repo"]
    start_msg = f"Starting indexer (repo={env.get('REPO', 'agro')}, skip_dense={bool(skip_dense)}, enrich={bool(enrich)})"
    yield f"data: {json.dumps({'type': 'log', 'message': start_msg})}\n\n"
    yield f"data: {json.dumps({'type': 'progress', 'percent': 0, 'message': 'Initializing indexer'})}\n\n"

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=1,
        universal_newlines=True,
        cwd=str(repo_root()),
        env=env,
    )

    for line in iter(process.stdout.readline, ''):
        if await request.is_disconnected():
            process.terminate()
            break
        yield f"data: {json.dumps({'type': 'log', 'message': line.strip()})}\n\n"
        await asyncio.sleep(0.01)

    process.wait()

    if process.returncode == 0:
        yield f"data: {json.dumps({'type': 'progress', 'percent': 100, 'message': 'Indexing complete'})}\n\n"
        yield "data: {\"type\": \"complete\"}\n\n"
    else:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Indexing failed with code {process.returncode}'})}\n\n"


@router.get("/api/stream/index/run")
async def stream_index(
    request: Request,
    repo: Optional[str] = None,
    skip_dense: int = 0,
    enrich: int = 0
):
    """Run the indexer with streaming logs via SSE."""
    return StreamingResponse(
        stream_index_run(repo, skip_dense, enrich, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
