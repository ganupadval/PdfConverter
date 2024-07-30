import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./Pages/Home";
import Output from "./Pages/Output";
import Notfound from "./Pages/Notfound";
function App() {
  const [count, setCount] = useState(0);



  return (
    // <div className='w-full h-screen flex justify-center items-center text-9xl'>Team DataMiners</div>
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />}></Route>
          <Route path="/processed" element={<Output />}></Route>
          <Route path="*" element={<Notfound />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
