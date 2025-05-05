import { motion } from "framer-motion";
import "./codeMarquee.css";

function shuffle(array) {
  let shuffledArray = array;
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [array[j], array[i]];
  }
  return shuffledArray;
}

function CodeMarquee({ columns }) {
  const timings = [6, 12, 20, 30, 40];
  let staticTimings = new Array(columns);
  let staticDirections = new Array(columns);
  let symbol_lists = new Array(columns);

  let original_symbol_list = [
    "[",
    "]",
    "x",
    "i",
    "+",
    "-",
    "{",
    "}",
    "/",
    "=",
    "|",
    "$",
    ":",
    ";",
    "->",
    "%",
    "&",
    "#",
    "~",
    "::",
    "(",
    ")",
    '"',
  ];
  //init a random  list for each column
  for (let i = 0; i < columns; i++) {
    //must put [...array] to create a new one, to avoid making copies by reference
    symbol_lists[i] = shuffle([...original_symbol_list]);
  }
  console.log(symbol_lists);
  //init a random speed for each column
  for (let i = 0; i < columns; i++) {
    staticTimings[i] = timings[Math.floor(Math.random() * timings.length)];
  }
  //init a random direction for each column
  for (let i = 0; i < columns; i++) {
    staticDirections[i] = Math.floor(Math.random() * 2);
  }

  let upDirection = {
    initial: { y: "0%" },
    animate: { y: "-100%" },
  };
  let downDirection = {
    initial: { y: "-100%" },
    animate: { y: "0%" },
  };

  return (
    <div className="z-0 h-[100vh] content-center items-center overflow-hidden overflow-y-hidden overscroll-x-none">
      {/*rendering two of the motion divs makes the animation run smoothly (idek know why)*/}

      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="flex justify-evenly outline-amber-700">
          {/* number of columns*/}
          {Array.from({ length: columns }).map((_, index2) => (
            <>
              <motion.div
                key={index2}
                className="marquee"
                {...(staticDirections[index2] === 0
                  ? upDirection
                  : downDirection)}
                transition={{
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: staticTimings[index2],
                  ease: "linear",
                }}
              >
                <div className="flex flex-col content-center items-center justify-center align-middle">
                  {symbol_lists[index2].map((item, i) => (
                    <div
                      key={i}
                      className="font-secondary text-primary flex h-[220px] content-center items-center justify-center text-[200px]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          ))}
        </div>
      ))}
    </div>
  );
}

export default CodeMarquee;
