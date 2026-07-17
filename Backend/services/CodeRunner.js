// the only file that talks with the docker container
const { spawn } = require("child_process");

const TIMEOUT_MS = 10000; //may change after implementing bullMq;

function runInContainer(runner, jobDir) {
  return new Promise((resolve) => {
    const args = [
      "run",
      "--rm",
      "--network",
      "none",
      "--memory",
      "256m",
      "--cpus",
      "0.5",
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
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    container.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    container.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      timedOut = true;
      container.kill();
    }, TIMEOUT_MS);
    container.on("close", (exitCode) => {
      clearTimeout(timer);
      if (timedOut) stderr += "\nTime limit exceeded";
      resolve({ stdout, stderr, exitCode });
    });

    container.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        stdout: "",
        stderr: `Failed to start container: ${err.message}`,
        exitCode: -1,
      });
    });
  });
}

module.exports = runInContainer;
