const { exec } = require('child_process');

function gitInit() {
  return new Promise((resolve, reject) => {
    exec('git init', (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout || stderr);
    });
  });
}

function gitConfigure(user) {
  return new Promise((resolve, reject) => {
    exec(`git config user.name "${user}"`, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout || stderr);
    });
  });
}

function gitAdd() {
  return new Promise((resolve, reject) => {
    exec('git add .', (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout || stderr);
    });
  });
}

function gitCommit(message) {
  return new Promise((resolve, reject) => {
    exec(`git commit -m "${message}"`, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout || stderr);
    });
  });
}

function gitStatus() {
  return new Promise((resolve, reject) => {
    exec('git status', (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout || stderr);
    });
  });
}

module.exports = { gitInit, gitConfigure, gitAdd, gitCommit, gitStatus };
