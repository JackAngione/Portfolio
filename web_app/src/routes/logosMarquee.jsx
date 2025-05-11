import Marquee from "react-fast-marquee";

import vitelogo from "../svgIcons/Vitejs-logo.svg";
import reactlogo from "../svgIcons/React-icon.svg";
import tailwindlogo from "../svgIcons/tailwindcss.svg";
import BunLogo from "../svgIcons/BunLogo.svg";
import meilisearchlogo from "../svgIcons/meilisearchlogo.svg";
import dockerLogo from "../svgIcons/docker-mark-blue.svg";
import npxlogo from "../svgIcons/NPX.svg";
import rustLogo from "../svgIcons/rust-logo.svg";
import React from "react";

function LogosMarquee() {
  //alter length to change the number of logos generated
  const logoArray = Array.from({ length: 12 }, (_, index) => index);
  return (
    <div className="relative">
      {/*Text that is cuttoff is hidden as window scales*/}
      <div className="ml-10 flex h-10 text-center">
        <div className="font-primary text-secondary flex flex-wrap justify-center overflow-hidden text-4xl font-bold whitespace-nowrap">
          {logoArray.map((item, index) => (
            <div key={index}>
              <p className="pr-12">POWERED BY</p>
              <p className="pr-12">POWERED BY</p>
              <p className="pr-12">POWERED BY</p>
              <p className="pr-12">POWERED BY</p>
              <p className="pr-12">POWERED BY</p>
            </div>
          ))}
        </div>
      </div>

      <div className="z-0">
        <Marquee
          pauseOnHover={true}
          pauseOnClick={true}
          speed={22}
          className="-mb-4 items-center"
        >
          {logoArray.map((item, index) => (
            <div className="flex items-center justify-center" key={index}>
              <a
                href="https://vite.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4"
              >
                <li className="flex items-center justify-center">
                  <img src={vitelogo} className="mr-2 w-12" alt="vite logo" />
                </li>
              </a>

              <a
                href="https://vite.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4"
              >
                <li className="flex items-center justify-center">
                  <img src={reactlogo} className="mr-2 w-12" alt="react logo" />
                </li>
              </a>

              <a
                href="https://tailwindcss.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4"
              >
                <li className="flex items-center justify-center">
                  <img
                    src={tailwindlogo}
                    className="mr-2 w-12"
                    alt="vite logo"
                  />
                  {/*tailwindcss*/}
                </li>
              </a>

              <a
                href="https://bun.sh/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2"
              >
                <li className="flex items-center justify-center">
                  <img src={BunLogo} className="mr-2 w-12" alt="vite logo" />
                  {/*Bun*/}
                </li>
              </a>

              <a
                href="https://www.meilisearch.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4"
              >
                <li className="flex items-center justify-center">
                  <img
                    src={meilisearchlogo}
                    className="mr-2 w-12"
                    alt="vite logo"
                  />
                  {/*meilisearch*/}
                </li>
              </a>

              <a
                href="https://www.docker.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4"
              >
                <li className="flex items-center justify-center">
                  <img src={dockerLogo} className="mr-2 w-12" alt="vite logo" />
                  {/*Docker*/}
                </li>
              </a>

              <a
                href="https://nginxproxymanager.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4"
              >
                <li className="flex items-center justify-center">
                  <img src={npxlogo} className="mr-2 w-12" alt="vite logo" />
                  {/*Nginx Proxy Manager*/}
                </li>
              </a>
              <a
                href="https://www.rust-lang.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4"
              >
                <li className="flex items-center justify-center invert">
                  <img src={rustLogo} className="mr-2 w-12" alt="vite logo" />
                  {/*Rust*/}
                </li>
              </a>
            </div>
          ))}
        </Marquee>
      </div>
    </div>
  );
}

export default LogosMarquee;
