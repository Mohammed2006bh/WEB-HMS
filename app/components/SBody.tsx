"use client";

import { ReactNode } from "react";

interface BodyProps {
  children: ReactNode;
}

export default function SBody({ children }: BodyProps) {
  return (
    <main className="body-container text-center">
      {children}
    </main>
  );
}