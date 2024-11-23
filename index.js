const markdownEditor = document.getElementById("markdown");
const previewResult = document.getElementById("preview");
const saveChangesBtn = document.getElementsByClassName("save-changes-btn")[0];
const documentName = document.getElementById("documentName");
const documentExtension = document.getElementById("documentExtension");
const clearBtn = document.getElementById("clearBtn");
var timer;
let expectedNumber = 1; // Următorul număr așteptat în listă

previewResult.clientHeight = markdownEditor.clientHeight;
startPage();
updateEditor();

clearBtn.addEventListener("click", () => {
  markdownEditor.value = "";
  updateEditor();
});

saveChangesBtn.addEventListener("click", () => {
  localStorage.setItem("markdownCode", markdownEditor.value);
  localStorage.setItem("documentName", documentName.value);
  localStorage.setItem("documentExtension", documentExtension.value);
});

markdownEditor.addEventListener("keyup", () => {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(updateEditor, 1000);
});

function startPage() {
  markdownEditor.value = localStorage.getItem("markdownCode");
  documentName.value = localStorage.getItem("documentName");
  documentExtension.value = localStorage.getItem("documentExtension");
}

function updateEditor() {
  let lines = formatTextAutomatically();
  showChanges(lines);
}

function formatTextAutomatically() {
  let text = markdownEditor.value;
  text = text.trim();
  lines = text.split("\n");
  while (lines.includes("")) lines.splice(lines.indexOf(""), 1);
  markdownEditor.value = lines.join("\n\n");
  return lines;
}

function showChanges(lines) {
  console.log(lines.length);
  previewResult.innerHTML = "";
  let inCodeBlock = false; // Variabilă pentru a indica dacă suntem într-un block de cod
  let codeBlockContent = []; // Stochează conținutul block-ului de cod

  for (let i = 0; i < lines.length; i++) {
    expectedNumber = 1;

    let line = lines[i].trim(); // Elimină spațiile de la început și sfârșit
    line = processLine(line);

    // Dacă linia este delimitator pentru block de cod
    if (line === "```") {
      if (inCodeBlock) {
        // Dacă suntem deja într-un block de cod, se încheie block-ul
        const codeBlock = document.createElement("pre");
        const code = document.createElement("code");
        code.innerText = codeBlockContent.join("\n"); // Adaugă conținutul ca un block
        codeBlock.classList.add("codeblock");
        codeBlock.appendChild(code);
        previewResult.append(codeBlock);

        // Resetează variabilele
        inCodeBlock = false;
        codeBlockContent = [];
      } else {
        // Dacă nu suntem într-un block de cod, începe unul nou
        inCodeBlock = true;
      }
      continue; // Continuă la următoarea linie, deoarece linia curentă este delimitator
    }

    // Dacă suntem într-un block de cod, adaugă linia curentă la conținut
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue; // Sari la următoarea linie fără alte procesări
    }

    // dacă linia este un header
    if (line.startsWith("#")) {
      let count = 0;
      while (line.startsWith("#")) {
        line = line.slice(1); // Elimină primul caracter #
        count++;
      }
      line = line.trim(); // Elimină spațiile de după #
      if (count > 6) count = 6; // HTML suportă doar <h1> până la <h6>
      const header = document.createElement(`h${count}`);
      header.innerHTML = line;
      previewResult.append(header);
    }

    // dacă linia face parte dintr-o listă numerică
    else if (/^\d+\./.test(line) && isNumberedList(line)) {
      let j = i;
      expectedNumber = 1;

      while (j < lines.length && isNumberedList(lines[j])) {
        j++;
      }

      let numberedList = lines.slice(i, j);
      if (numberedList.length > 0) {
        const orderedList = document.createElement("ol");

        for (let k = 0; k < numberedList.length; k++) {
          const element = numberedList[k];

          numberedList[k] = processLine(numberedList[k]);

          const listItem = document.createElement("li");
          listItem.innerHTML = element.replace(/^\d+\.\s*/, ""); // Scoate numărul și punctul
          orderedList.append(listItem);
        }

        previewResult.append(orderedList);

        i = j - 1;
        continue;
      }
    }

    // dacă linia face parte dintr-o listă neordonată
    else if (line.startsWith("-")) {
      let j = i;

      while (j < lines.length && lines[j].startsWith("-")) {
        j++;
      }

      let bulletList = lines.slice(i, j);
      if (bulletList.length > 0) {
        const unorderedList = document.createElement("ul");

        for (let k = 0; k < bulletList.length; k++) {
          const element = bulletList[k];

          bulletList[k] = processLine(bulletList[k]);

          const listItem = document.createElement("li");
          listItem.innerHTML = element.slice(1); // Scoate -
          unorderedList.append(listItem);
        }

        previewResult.append(unorderedList);

        i = j - 1;
        continue;
      }
    }

    // Dacă linia este paragraf highlighted
    else if (line.startsWith(">")) {
      const paragraphHigh = document.createElement("div");
      paragraphHigh.classList.add("paraHigh");
      paragraphHigh.innerHTML = line.slice(1);

      previewResult.append(paragraphHigh);
    }

    // Dacă linia este altceva (text simplu)
    else {
      const paragraph = document.createElement("p");
      paragraph.innerHTML = line;
      previewResult.append(paragraph);
    }
  }
}

function isNumberedList(line) {
  // Verificăm dacă începe cu un număr urmat de un punct
  const match = line.match(/^(\d+)\./);
  if (match) {
    const number = parseInt(match[1]); // Extragem numărul
    if (number === expectedNumber) {
      expectedNumber++; // Creștem numărul așteptat pentru următoarea linie
      return true; // Face parte din lista numerotată
    }
  }
  return false; // Nu face parte din lista numerotată
}

function processLine(line) {
  // Expresie regulată pentru detectarea linkurilor de forma [text] (link)
  const linkRegex = /\[([^\]]+)\]\s*\(([^)]+)\)/g;

  // Expresie regulată pentru detectarea codului inline între backticks (`...`)
  const inlineCodeRegex = /`([^`]+)`/g;

  // Înlocuiește codul inline cu un element HTML <code>
  line = line.replace(inlineCodeRegex, (match, code) => {
    const codeElement = document.createElement("code");
    codeElement.innerText = code.trim();
    const div = document.createElement("div");
    div.appendChild(codeElement);
    return div.innerHTML; // Returnăm HTML-ul pentru cod
  });

  // Înlocuiește fiecare link găsit cu un element HTML <a>
  line = line.replace(linkRegex, (match, text, url) => {
    const link = document.createElement("a");
    link.href = url.trim();
    link.innerText = text.trim();
    // link.target = "_blank"; // Deschide linkul într-o fereastră nouă
    const div = document.createElement("div");
    div.appendChild(link);
    return div.innerHTML; // Returnăm HTML-ul pentru link
  });

  return line;
}
