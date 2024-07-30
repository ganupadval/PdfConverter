import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { useNavigate } from "react-router-dom";
import { MultiStepLoader as Loader } from "../ui/multi-step-loader";
import { IconSquareRoundedX } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { HeroHighlight } from "../ui/hero-highlight";
import { MdOutlineDriveFolderUpload } from "react-icons/md";
import { TfiFiles } from "react-icons/tfi";
import { Button } from "@material-tailwind/react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import InvoiceTable from "./data.jsx";
import { useEffect } from "react";
const PDFJS = window.pdfjsLib;
const genAI = new GoogleGenerativeAI("AIzaSyAyXKeVogNf-gsKkwQ4E43YOXzN5s9ww3E");

const loadingStates = [
  { text: "Thanks for uploading your pdf" },
  { text: "proccessing pdf" },
  { text: "Identifying types.." },
  { text: "Generating insights..." },
  { text: "Generating JSON response" },
  { text: "Results" },
];

const Hero = () => {
  const dropAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null); // Added state to store invoice data
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
    dropAreaRef.current.classList.add("border-blue-700");
  };

  const handleDragLeave = () => {
    dropAreaRef.current.classList.remove("border-blue-700");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropAreaRef.current.classList.remove("border-blue-700");
    const files = e.dataTransfer.files;
    if (files.length === 1 && files[0].type === "application/pdf") {
      setFileName(files[0].name);
      setError("");
      console.log("Dropped files:", files);
    } else {
      setFileName("");
      setError("Please drop a single PDF file.");
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current.click();
  };

  // const handleFileChange = (e) => {
  //   const pdfFile = e.target.files[0];
  //   convertPdfToImage(pdfFile);
  // };

  const handleFileChange = (e) => {
    const pdfFile = e.target.files[0];    
    // Navigate to the next component, passing the PDF file as state
    navigate("/processed", { state: { pdfFile } });
};


  const convertPdfToImage = (pdfFile) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      const pdfData = await PDFJS.getDocument({ data: arrayBuffer });
      processPdfPages(pdfData);
    };
    reader.readAsArrayBuffer(pdfFile);
  };

  const processPdfPages = async (pdfData) => {
    const page = await pdfData.getPage(1); // Get the first page
    const viewport = page.getViewport({ scale: 1.0 }); // Adjust scale if needed
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;

    // Convert canvas to base64
    const imageData = canvas.toDataURL("image/png");

    // Prepare image object
    const image = {
      inlineData: {
        data: imageData.replace(/^data:image\/(png|jpg);base64,/, ""),
        mimeType: "image/png",
      },
    };

    // Send prompt and image to API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const prompt =
      "extract data from the given image and give it in useful json format";
    const result = await model.generateContentStream([prompt, image]);
    // console.log(result.response.text());
    let text = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      console.log(chunkText);
      text += chunkText;
    }
    // Assuming responseData contains the JSON response with the 'json' keyword and backticks
    // const cleanedResponse = result.response
    //   .text()
    //   .replace(/(\bjson\b|`)/gi, "");
    const cleanedResponse = text.replace(/(\bjson\b|`)/gi, "");
    setInvoiceData(JSON.parse(cleanedResponse)); // Set invoice data state
    setLoading(false); // Set loading state to false
  };

  return (
    <HeroHighlight
      id="landingComponent"
      className="  flex flex-col justify-center text-center"
    >
      <motion.h1
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: [20, -5, 0],
        }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0.0, 0.2, 1],
        }}
      >
        <Loader
          loadingStates={loadingStates}
          loading={loading}
          duration={2000}
        />
        {loading && (
          <button
            className="fixed top-4 right-4 text-black dark:text-white z-[120]"
            onClick={() => setLoading(false)}
          >
            <IconSquareRoundedX className="h-10 w-10" />
          </button>
        )}
        <div className="px-15 ">
          <h1 className=" heroText font-bold sm:text-[40px] text-2xl md:m-6 leading-10  md:text text-gray-700 text-center text-wrap">
            Fastten the process of{" "}
            <span className="text-blue-500">finding insights</span> from your
            documents & have <span className="text-blue-500">conversation</span>{" "}
            with your document
          </h1>
          <h3 className="text-gray-500 sm:text-[25px] text-lg">
            Upload your document, to get started
          </h3>
          <h3 className="text-gray-500 sm:text-[25px] text-lg">
            Example Invoice, Bill of reading, Entry etc in PDF
          </h3>
        </div>
        <div className="mx-24 mt-5 mb-16 h-60 rounded-md  bg-blue-100">
          <div className="mx-20 my-5  pt-5 border justify-center items-center text-center border-dashed h-48 border-blue-500 ">
            <h1>Drag and Drop PDF document or click on upload button</h1>
          </div>
        </div>
        <div
          ref={dropAreaRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          id="dropComponent"
          className=" p-2  sm:w-2/5 sm:mx-auto my-10 mx-4 md:h-60  bg-white shadow-xl shadow-gray-400 rounded"
        >
          <div className=" md:mx-5 my-5 pt-5  border flex justify-center items-center text-center bg-blue-100 rounded border-dashed md:h-48 border-blue-500 ">
            {fileName ? (
              <>
                <p className="text-sm md:text-lg mb-4">File Name: {fileName}</p>
                <button
                  className="bg-white mb-5 text-white px-4 py-2 rounded-md"
                  onClick={handleUpload}
                >
                  Upload
                </button>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center">
                <TfiFiles size={50} />
                <div>
                  <p className="mt-2 font-semibold ">
                    Click to upload or Drop file here
                  </p>
                </div>

                <Button
                  onClick={handleChooseFile}
                  className="bg-blue-500 flex flex-row justify-center items-center font-semibold py-2 px-4 mt-2 hover:opacity-90"
                >
                  <MdOutlineDriveFolderUpload size={20} className="mr-2" />
                  Upload Files
                </Button>
              </div>
            )}
            {error && <p className="text-red-500">{error}</p>}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept=".pdf"
            />
          </div>
        </div>
      </motion.h1>
    </HeroHighlight>
  );
};

export default Hero;
