import server from "./app.js";
// import { exec } from "child_process";
// import { CronJob } from "cron";

// const restartCommand = "pm2 restart whatsmapp-vm --update-env";

// const restartApp = function () {
//   exec(restartCommand, (err, stdout, stderr) => {
//     if (!err && !stderr) {
//       console.log(new Date(), `App restarted!`);
//     } else if (err || stderr) {
//       console.log(
//         new Date(),
//         `Error in executing ${restartCommand}`,
//         err || stderr
//       );
//     }
//   });
// };

// new CronJob(
//   "0 0 2 * * *",
//   function () {
//     console.log("2 am America/Sao_Paulo time, restarting the api");
//     restartApp();
//   },
//   null,
//   true,
//   "America/Sao_Paulo"
// );

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log("Press Ctrl+C to quit.");
});
