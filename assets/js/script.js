const textInput = document.getElementById("textInput");
const analyzeButton = document.getElementById("analyzeButton");
const outputSection = document.getElementById("outputSection");
const downloadSection = document.getElementById("downloadSection");
const fileInput = document.getElementById("fileInput"); 
const loadingOverlay = document.getElementById("loadingOverlay"); 
const generateFilesButton = document.getElementById("generateFilesButton");
const generationSection = document.getElementById("generationSection");

let alliterationPairs = [];
let inputText = "";

// Initialize PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

analyzeButton.addEventListener("click", handleAnalysis);

function handleAnalysis() {
    const val = textInput.value;
    if (val.trim() === "") {
        alert("Please enter text in the input box.");
    } else {
        startAnalysis(val);
    }
}

// File Upload Handler for .txt, .docx, and .pdf
if (fileInput) {
    fileInput.addEventListener("change", async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        loadingOverlay.style.display = "flex";
        const fileName = file.name.toLowerCase();

        const reader = new FileReader();
        if (fileName.endsWith(".txt")) {
            reader.onload = (e) => startAnalysis(e.target.result);
            reader.readAsText(file);
        } else if (fileName.endsWith(".docx")) {
            reader.onload = async (e) => {
                const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
                startAnalysis(result.value);
            };
            reader.readAsArrayBuffer(file);
        } else if (fileName.endsWith(".pdf")) {
            reader.onload = async (e) => {
                const pdf = await pdfjsLib.getDocument(new Uint8Array(e.target.result)).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map(item => item.str).join(" ") + "\n";
                }
                startAnalysis(fullText);
            };
            reader.readAsArrayBuffer(file);
        }
    });
}

// Optimized flow: stays on loading screen until all files are ready
async function startAnalysis(text) {
    loadingOverlay.style.display = "flex";
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        inputText = text;
        alliterationPairs = detectAlliteration(inputText);
        displayAlliterationGroups(alliterationPairs);
        
        // Show the generation section instead of automatically downloading
        if (alliterationPairs.length > 0) {
            generationSection.style.display = "block";
            downloadSection.innerHTML = ""; // Clear old links
        }
    } catch (error) {
        console.error("Analysis Error:", error);
    } finally {
        loadingOverlay.style.display = "none";
    }
}
function detectAlliteration(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const pairs = [];
    for (let s = 0; s < sentences.length; s++) {
        const rawWords = sentences[s].split(/\s+/);
        
        // OPTIMIZATION: Keep only alphabet characters and filter out numbers/symbols
        const words = rawWords.map(word => word.replace(/[^a-zA-Z]/g, '')).filter(word => word.length > 0);

        const uniqueWords = Array.from(new Set(words.map(w => w.toLowerCase())));
        for (let i = 0; i < uniqueWords.length; i++) {
            const current = uniqueWords[i];
            for (let j = i + 1; j < uniqueWords.length; j++) {
                const next = uniqueWords[j];
                if (current.charAt(0) === next.charAt(0) && current !== "") {
                    pairs.push({
                        alliterationWord: current,
                        followingWord: next,
                        sentenceIndex: s,
                    });
                }
            }
        }
    }
    return pairs;
}

function displayAlliterationGroups(pairs) {
    outputSection.innerHTML = "";
    const grouped = groupAlliterationPairs(pairs);
    const sortedKeys = Array.from(grouped.keys()).sort();
    for (const key of sortedKeys) {
        const container = document.createElement("div");
        container.classList.add("alliteration-group");
        const title = document.createElement("h2");
        title.textContent = `${key} Group`;
        title.style.color = getGroupColor(key);
        container.appendChild(title);
        for (const pair of grouped.get(key)) {
            const p = document.createElement("div");
            p.classList.add("alliteration-pair");
            p.innerHTML = `<span style="color: black;">${pair.alliterationWord}</span> - <span style="color: black;">${pair.followingWord}</span> (Sentence ${pair.sentenceIndex + 1})`;
            container.appendChild(p);
        }
        outputSection.appendChild(container);
    }
}

function groupAlliterationPairs(pairs) {
    const map = new Map();
    for (const pair of pairs) {
        const key = pair.alliterationWord[0].toUpperCase();
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(pair);
    }
    return map;
}

function downloadAllAlliterationPairs(pairs, text) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Alliteration Pairs");
    worksheet.addRow(["No.", "Pairs", "Where to find", "Full sentence"]);

    const sentenceArr = text.split(/[.!?]/);
    pairs.forEach((pair, index) => {
        const sentence = sentenceArr[pair.sentenceIndex] ? sentenceArr[pair.sentenceIndex].trim() : "";
        worksheet.addRow([index + 1, `${pair.alliterationWord} - ${pair.followingWord}`, pair.sentenceIndex + 1, sentence]);
    });

    return workbook.xlsx.writeBuffer().then(function(buffer) {
        const xlsxLink = createDownloadLink(new Blob([buffer]), "alliteration.xlsx", "Download XLSX");

        const txtContent = pairs.map(p => `${p.alliterationWord} - ${p.followingWord} (Sentence ${p.sentenceIndex + 1})`).join("\n");
        const txtLink = createDownloadLink(new Blob([txtContent], { type: "text/plain" }), "alliteration.txt", "Download TXT");

        const docxHtml = generateDocxContent(text, pairs);
        const docxBlob = htmlDocx.asBlob(`<html><body>${docxHtml}</body></html>`);
        const docxLink = createDownloadLink(docxBlob, "alliteration.docx", "Download DOCX");

        downloadSection.innerHTML = "";
        [xlsxLink, txtLink, docxLink].forEach(link => {
            downloadSection.appendChild(link);
            downloadSection.appendChild(document.createTextNode(" "));
        });
    });
}

function generateDocxContent(text, pairs) {
    let coloredText = text;
    for (const pair of pairs) {
        const regex = new RegExp(`\\b${pair.alliterationWord}\\b|\\b${pair.followingWord}\\b`, 'gi');
        const color = getGroupColor(pair.alliterationWord[0].toUpperCase());
        coloredText = coloredText.replace(regex, `<span style="background-color: ${color};">$&</span>`);
    }
    return coloredText;
}

function createDownloadLink(blob, filename, label) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.classList.add("download-button");
    a.textContent = label;
    return a;
}

function getGroupColor(key) {
    const colors = { A: '#240065', B: '#4B0082', C: '#7363BA', D: '#9D96E6', E: '#800000', F: '#FF0000', G: '#FF7373', H: '#FFB6B6', I: '#FFA500', J: '#FFD700', K: '#00FF00', L: '#0000FF', M: '#8A2BE2', N: '#800080', O: '#FF00FF', P: '#FFC0CB', Q: '#FF7F50', R: '#00FFFF', S: '#20B2AA', T: '#E6E6FA', U: '#FF7F00', V: '#FFFF00', W: '#7CFC00', X: '#ADD8E6', Y: '#EE82EE', Z: '#9400D3' };
    return colors[key.toUpperCase()] || '#808080';
}

function blockCharacters(id, blocked) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
        e.target.value = e.target.value.split('').filter(c => !blocked.includes(c)).join('');
    });
}

// FIX: Corrected syntax error (removed stray comma)
blockCharacters('textInput', ['<', '>', '{', '}', "'"]);
generateFilesButton.addEventListener("click", async function() {
    loadingOverlay.style.display = "flex";
    // Give the UI a moment to show the loader
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        // Now we run the heavy file generation only when requested
        await downloadAllAlliterationPairs(alliterationPairs, inputText);
        generationSection.style.display = "none"; // Hide the button once links appear
    } catch (error) {
        alert("Failed to generate files. The document might be too large for your browser's memory.");
    } finally {
        loadingOverlay.style.display = "none";
    }
})