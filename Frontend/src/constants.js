export const LANGUAGE_VERSIONS = {
  cpp: "GCC 13 / C++17",
  java: "JDK 21",
  python: "3.11",
};

export const CODE_SNIPPETS = {
  cpp: `#include <iostream>\n\nint main() {\n\tstd::cout << "Hello World!" << std::endl;\n\treturn 0;\n}\n`,
  java: `public class Main {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("Hello World");\n\t}\n}\n`,
  python: `def greet(name):\n\tprint("Hello, " + name + "!")\n\ngreet("Alex")\n`,
};
