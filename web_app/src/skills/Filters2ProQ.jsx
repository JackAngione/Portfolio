import { motion } from "motion/react";
import React from "react";
import { media_server_address } from "../serverInfo.jsx";
import "./codeProjects.css";

function Filters2ProQ() {
  return (
    <div className="mt-15 flex justify-center">
      <div className="min-h-[90vh] w-[96vw] rounded-4xl bg-linear-180 from-[oklch(0.8713_0.257583_147.1986)] from-15% to-[oklch(0.7894_0.1415_225.83)] to-85% p-2 sm:p-4">
        <p className="font-modak text-[64px] break-all overflow-ellipsis text-white sm:text-[100px]">
          Filters<sub>2</sub>ProQ
        </p>

        <p className="mt-16 text-lg text-white">
          Convert REW and AutoEQ Filters to a FabFilter Pro-Q4 Preset
        </p>
        <div className="flex justify-center">
          <div className="border-b-1.5 w-80"></div>
        </div>
        <p className="text-lg text-white">Supports Separate L/R Channels</p>

        <div className="mt-40 flex flex-col items-center justify-center align-middle sm:flex-row">
          <motion.a
            href="https://github.com/JackAngione/Filters2ProQ"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.25 }}
          >
            <svg width="98" height="96" xmlns="http://www.w3.org/2000/svg">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                fill="white"
              />
            </svg>
          </motion.a>
          <motion.button
            className="backdrop-blur-4xl !hover:outline-white h-22 w-46 !rounded-3xl border-2 border-white !bg-linear-0 !from-white/10 !to-white/10 !font-bold !text-white"
            onClick={() => {
              window.open(media_server_address + "/f2q", "_blank");
            }}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.25 }}
          >
            MacOS Download
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default Filters2ProQ;
