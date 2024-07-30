import React, { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useLocation } from "react-router-dom";

const PDFJS = window.pdfjsLib;

// Initialize API clients with different API keys
const apiClients = [
  new GoogleGenerativeAI("AIzaSyAyXKeVogNf-gsKkwQ4E43YOXzN5s9ww3E"), // Client 1
  new GoogleGenerativeAI("AIzaSyDXeBX4H3pCndwRsZc2Yxgrpv9Xr3XRNek"), // Client 2
  new GoogleGenerativeAI("AIzaSyDILALHMFNmzhiTuki0JWINf-Y_mFY3264"), // Client 3
  new GoogleGenerativeAI("YAIzaSyAidjqSXcwJuLkIRuGA6N6PmENYUkO98f4"), // Client 4
];

export default function Output() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [streamingData, setStreamingData] = useState({}); // State for streaming data
  const payloadObj = [];
  const { pdfFile } = location.state || {};

  useEffect(() => {
    if (pdfFile) {
      setLoading(true);
      convertPdfToImage(pdfFile);
    }
  }, [pdfFile]);

  const convertPdfToImage = async (pdfFile) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      if (!arrayBuffer) {
        console.error("Failed to read PDF file: array buffer is None");
        setLoading(false);
        return;
      }

      try {
        const pdfData = await PDFJS.getDocument({ data: arrayBuffer });
        if (!pdfData) {
          console.error("Failed to load PDF document: pdfData is None");
          setLoading(false);
          return;
        }
        await processPdfPages(pdfData);
      } catch (error) {
        console.error("Error processing PDF file:", error);
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(pdfFile);
  };

  const processPdfPages = async (pdfData) => {
    const numPages = pdfData.numPages;
    console.log(numPages);
    // Create an array of promises for each page processing
    const promises = [];

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
      const apiIndex = (pageNumber - 1) % apiClients.length; // Cycle through the API clients
      const client = apiClients[apiIndex];
      console.log(pageNumber);
      // Create a promise for each page and push it to the promises array
      const pagePromise = processPage(pdfData, pageNumber, client);
      promises.push(pagePromise);
    }

    // Wait for all promises to resolve
    await Promise.all(promises);

    // Set loading to false after processing all pages
    setLoading(false);
  };

  const processedPages = new Set(); // Create a set to track processed pages

  const processPage = async (pdfData, pageNumber, client) => {
    // Check if the page has already been processed
    if (processedPages.has(pageNumber)) {
      return; // If yes, skip processing
    }

    const page = await pdfData.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
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

    // Send prompt and image to API using the provided client
    const model = client.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const prompt =
      "Extract data from the given image and give it in useful JSON format";
    const result = await model.generateContent([prompt, image]);

    // Parse the JSON response
    const cleanedResponse = result.response
      .text()
      .replace(/(\bjson\b|`)/gi, "");
    const parsedData = JSON.parse(cleanedResponse);

    // // Update streaming data state with the parsed data for the current page
    // setStreamingData((prevData) => ({
    //   ...prevData,
    //   [pageNumber]: parsedData,
    // }));

    // Create the request payload
    const payload = {
      prompt,
      image: imageData.split(",")[1],
      json: JSON.stringify(parsedData),
    };
    payloadObj.push(payload);

    // Mark the page as processed
    processedPages.add(pageNumber);

    // Return parsed data if needed elsewhere
    return parsedData;
  };

  const uploadData = async (e) => {
    e.preventDefault();

    for (let i = 0; i <= payloadObj.length; i++) {
      try {
        const apiEndpoint = "http://127.0.0.1:8000/upload";
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payloadObj[i]),
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log(responseData);
        } else {
          console.error(response.statusText);
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  // Return parsed data if needed elsewhere

  return (
    <div style={{ whiteSpace: "pre-wrap" }}>
      {loading ? (
        "Processing PDF file..."
      ) : (
        <>
          <pre>{JSON.stringify(streamingData, null, 2)}</pre>
          <button onClick={uploadData}>Save</button>
        </>
      )}
    </div>
  );
}
