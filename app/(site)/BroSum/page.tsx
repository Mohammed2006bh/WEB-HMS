"use client";

import FileExplorer from "@/app/components/FileExplorer";
import SBody from "@/app/components/SBody";
import { useState } from "react";


const notes = {
  "ITCE101": [
    {
      name: "Limits Summary",
      url: "/Mynotes/ITCE101/CE101.pdf",
    },
  ],
  "Chemistry101": [
    {
      name: "Limits Summary",
      url: "/Mynotes/CHEM101/CH101.pdf",
    },
  ],
  "ITSE201": [
    {
      name: "Limits Summary",
      url: "/Mynotes/ITSE201/SE201.pdf",
    },
  ],
  "IBMZ/OS": [
    {
      name: "Limits Summary",
      url: "/Mynotes/IBMZOS/IBMZOS.pdf",
    },
  ]
};

const art = {
  "Illustrations": [
    {
      name: "Bro Sword",
      url: "/MyART/Sword.png",
    },
  ]
};

export default function MyNotes() {
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [activePdf, setActivePdf] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);

  const openPdf = (file: string) => {
    setActivePdf(file);
    setFileType("pdf");
  };
  
  const openImage = (file: string) => {
    setActivePdf(file);
    setFileType("image");
  };


  const toggleFolder = (subject: string) => {
    setOpenFolder(openFolder === subject ? null : subject);
  };

  return (
    <>
        <h1 className="text-3xl font-bold underline text-center">
          Bro use a Light mode for a batter experience
        </h1>

        <SBody>
          <FileExplorer
                title="My Notes"
                data={notes}
                type="pdf"
           />
          </SBody>

        <SBody>
          <FileExplorer
             title="My Artwork"
             data={art}
             type="image"
          />
        </SBody>


        <SBody>
        <h1 className="text-3xl font-bold underline text-center">
          How to Downlod things
        </h1>


        <h4 className="text-2xl font-bold text-left">
          📺 Windows user's
        </h4>
        <p className="text-left">
          For the summaries click on the download button in the header tool <br />
          For artworks Right click on the art and click "Save As" to download it.
        </p>
        <br />
        <h4 className="text-2xl font-bold text-left">
          🖥️  Mac user's
        </h4>
        <p className="text-left">
        For the summaries click on the download button in the boutton tool <br />
        For artworks Right click on the art and click "Save As" to download it.
        </p>

        </SBody>

    </>
  );
}
