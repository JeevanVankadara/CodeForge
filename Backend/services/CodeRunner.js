// the only file that talks with the docker container
const path = require("path");
const { spawn } = require("child_process");

// How long the user's *program* may run. This is a product decision about
// infinite loops, and is not the same clock as RUN_WAIT_MS in runQueue.js, which
// bounds queue time + run time from the caller's point of view.
const TIMEOUT_MS = 10000;

// A `while(1) printf("x")` produces megabytes in ten seconds. Whatever we
// collect here ends up in Redis and then broadcast to every member of the room,
// so it has to be bounded.
const MAX_OUTPUT_BYTES = 64 * 1024;

// Appends to a capped buffer, remembering that it overflowed.
function makeSink() {
  return { text: "", truncated: false };
}

function append(sink, chunk) {
  if (sink.truncated) return;
  sink.text += chunk.toString();
  if (sink.text.length > MAX_OUTPUT_BYTES) {
    sink.text = sink.text.slice(0, MAX_OUTPUT_BYTES) + "\n...output truncated";
    sink.truncated = true;
  }
}

// Resolves with { stdout, stderr, exitCode } for anything the user's code did,
// including crashes and timeouts.
//
// Rejects only when the run could not be carried out at all - Docker not
// running, image missing. That distinction is what BullMQ's retry relies on:
// retrying a dead daemon is useful, retrying a segfault just reproduces it.
function runInContainer(runner, jobDir, input = "") {
  return new Promise((resolve, reject) => {
    // Naming the container gives us a handle to kill. Killing the `docker run`
    // client alone leaves the container running, which would quietly break the
    // concurrency ceiling the queue exists to enforce.
    const name = `cf-${path.basename(jobDir)}`;

    const args = [
      "run",
      "--rm",
      "-i",
      "--name",
      name,
      "--network",
      "none",
      "--memory",
      "256m",
      "--cpus",
      "0.5",
      "--pids-limit",
      "64",
      "-v",
      `${jobDir}:/app`,
      "-w",
      "/app",
      runner.image,
      "sh",
      "-c",
      runner.getRunCommand(),
    ];

    const container = spawn("docker", args); //spawn is used for loading heavty processes like docker, it is non-blocking and runs in the background
    const stdout = makeSink();
    const stderr = makeSink();
    let timedOut = false;
    let spawnFailed = false;

    container.stdin.on("error", () => {}); // container may exit before input drains
    container.stdin.write(input);
    container.stdin.end();

    container.stdout.on("data", (chunk) => append(stdout, chunk));
    container.stderr.on("data", (chunk) => append(stderr, chunk));

    const timer = setTimeout(() => {
      timedOut = true;
      // Stop the container itself, then the client we spawned.
      spawn("docker", ["kill", name]).on("error", () => {});
      container.kill();
    }, TIMEOUT_MS);

    container.on("close", (exitCode) => {
      clearTimeout(timer);
      if (spawnFailed) return;

      if (timedOut) {
        append(stderr, "\nTime limit exceeded");
        return resolve({ stdout: stdout.text, stderr: stderr.text, exitCode: -1 });
      }

      // Docker itself reports a missing image or an unreachable daemon on
      // stderr with exit 125, and that is an infrastructure fault, not the
      // program's output.
      if (exitCode === 125) {
        return reject(new Error(`Docker could not start the container: ${stderr.text.trim()}`));
      }

      resolve({ stdout: stdout.text, stderr: stderr.text, exitCode });
    });

    container.on("error", (err) => {
      spawnFailed = true;
      clearTimeout(timer);
      reject(new Error(`Failed to start container: ${err.message}`));
    });
  });
}

module.exports = runInContainer;
module.exports.TIMEOUT_MS = TIMEOUT_MS;
module.exports.MAX_OUTPUT_BYTES = MAX_OUTPUT_BYTES;
