import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export async function POST(req: Request) {
  try {
    const { projectName, language } = await req.json();

    if (!projectName || !language) {
      return NextResponse.json(
        { error: "Missing data" },
        { status: 400 }
      );
    }

    // المسار الأساسي للمشروع
    const basePath = path.join(process.cwd(), "NINAProjects");
    const projectPath = path.join(basePath, projectName);

    // لا تكتب فوق مشروع موجود
    if (fs.existsSync(projectPath)) {
      return NextResponse.json(
        { error: "Project already exists" },
        { status: 409 }
      );
    }

    // إنشاء الفولدرات
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, "src"));

    // تحديد الملف حسب اللغة
    let fileName = "main.txt";
    let fileContent = "";

    switch (language) {
      case "JavaScript":
        fileName = "main.js";
        fileContent = `console.log("NINA initialized: ${projectName}");`;
        break;

      case "TypeScript":
        fileName = "main.ts";
        fileContent = `console.log("NINA initialized: ${projectName}");`;
        break;

      case "Python":
        fileName = "main.py";
        fileContent = `print("NINA initialized: ${projectName}")`;
        break;

      case "Java":
        fileName = "Main.java";
        fileContent = `
public class Main {
    public static void main(String[] args) {
        System.out.println("NINA initialized: ${projectName}");
    }
}
`.trim();
        break;

      case "C++":
        fileName = "main.cpp";
        fileContent = `
#include <iostream>
int main() {
    std::cout << "NINA initialized: ${projectName}" << std::endl;
    return 0;
}
`.trim();
        break;

      case "Go":
        fileName = "main.go";
        fileContent = `
package main
import "fmt"

func main() {
    fmt.Println("NINA initialized: ${projectName}")
}
`.trim();
        break;

      default:
        fileName = "main.txt";
        fileContent = "NINA project initialized.";
    }

    // إنشاء ملف الكود
    fs.writeFileSync(
      path.join(projectPath, "src", fileName),
      fileContent
    );

    // README
    fs.writeFileSync(
      path.join(projectPath, "README.md"),
      `# ${projectName}\n\nCreated with NINA.`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
