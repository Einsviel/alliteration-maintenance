const textInput = document.getElementById("textInput");
const analyzeButton = document.getElementById("analyzeButton");
const outputSection = document.getElementById("outputSection");
const downloadSection = document.getElementById("downloadSection");

let alliterationPairs = [];
let inputText = "";

analyzeButton.addEventListener("click", handleAnalysis);

function handleAnalysis() {
    inputText = textInput.value;

    if (inputText.trim() === "") {
        alert("Please enter text in the input box.");
    } else {
        alliterationPairs = detectAlliteration(inputText);
        displayAlliterationGroups(alliterationPairs);
        displayDownloadLinks(alliterationPairs, inputText);
    }
}

function detectAlliteration(text) {
const sentences = text.match(/[^.!?]+[.!?]+/g);
const alliterationPairs = [];

if (!sentences) {
return alliterationPairs;
}

for (let s = 0; s < sentences.length; s++) {
const words = sentences[s].split(/\s+/);

const uniqueWords = Array.from(new Set(words.map(word => word.toLowerCase())));

for (let i = 0; i < uniqueWords.length; i++) {
    const currentWord = uniqueWords[i];

    for (let j = i + 1; j < uniqueWords.length; j++) {
        const nextWord = uniqueWords[j];

        // Check if the first letters match
        const isFirstLettersEqual = currentWord.charAt(0) === nextWord.charAt(0);

        if (isFirstLettersEqual) {
            const originalAlliterationWord = words.find(word => word.toLowerCase() === currentWord);
            const originalFollowingWord = words.find(word => word.toLowerCase() === nextWord);

            // Check if the positions are different before adding to pairs
            if (words.indexOf(originalAlliterationWord) !== words.indexOf(originalFollowingWord)) {
                alliterationPairs.push({
                    alliterationWord: currentWord,
                    followingWord: nextWord,
                    originalAlliterationWord,
                    originalFollowingWord,
                    sentenceIndex: s,
                });
            }
        }
    }
}
}

return alliterationPairs;
}
// Define the blockCharacters function
function blockCharacters(inputFieldId, blockedCharacters) {
const inputField = document.getElementById(inputFieldId);

inputField.addEventListener('input', function(event) {
const inputValue = event.target.value;
const filteredValue = inputValue.split('').filter(char => !blockedCharacters.includes(char)).join('');
inputField.value = filteredValue;
});
}

// Blocking all the characters that could mess up my code
blockCharacters('textInput', ['<', ,'>', '{', '}', "'" ]); 
function displayAlliterationGroups(alliterationPairs) {
outputSection.innerHTML = "";

const groupedAlliteration = groupAlliterationPairs(alliterationPairs);

// Sort the keys alphabetically
const sortedKeys = Array.from(groupedAlliteration.keys()).sort();

for (const groupKey of sortedKeys) {
const group = groupedAlliteration.get(groupKey);

const groupContainer = document.createElement("div");
groupContainer.classList.add("alliteration-group");

const groupTitle = document.createElement("h2");
groupTitle.textContent = `${groupKey} Group`;
groupTitle.style.color = getGroupColor(groupKey); // Set color for group title
groupContainer.appendChild(groupTitle);

for (const pair of group) {
    const pairElement = document.createElement("div");
    pairElement.classList.add("alliteration-pair");
    pairElement.innerHTML = `<span style="color: black;">${pair.alliterationWord}</span> - <span style="color: black;">${pair.followingWord}</span> (Sentence ${pair.sentenceIndex + 1})`;
    groupContainer.appendChild(pairElement);
}

outputSection.appendChild(groupContainer);
}
}



function groupAlliterationPairs(alliterationPairs) {
    const groupedAlliteration = new Map();

    for (const pair of alliterationPairs) {
        const key = pair.alliterationWord[0].toUpperCase();
        if (!groupedAlliteration.has(key)) {
            groupedAlliteration.set(key, []);
        }
        groupedAlliteration.get(key).push(pair);
    }

    return groupedAlliteration;
}

function displayDownloadLinks(alliterationPairs, inputText) {
    if (alliterationPairs.length === 0) {
        alert("No alliteration pairs found.");
    } else {
        downloadAllAlliterationPairs(alliterationPairs, inputText);
    }
}
function downloadAllAlliterationPairs(alliterationPairs, inputText) {
// Create a new workbook
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("Alliteration Pairs");

// Add headers
worksheet.addRow(["No.", "Pairs", "Where to find", "Full sentence"]);

// Add data rows
alliterationPairs.forEach((pair, index) => {
const pairString = `${pair.alliterationWord} - ${pair.followingWord}`;
const sentence = inputText.split(/[.!?]/)[pair.sentenceIndex].trim();
worksheet.addRow([index + 1, pairString, pair.sentenceIndex + 1, sentence]);
});

// Generate XLSX file
workbook.xlsx.writeBuffer().then(function(buffer) {
const xlsxBlob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
const downloadLinkXLSX = createDownloadLink(xlsxBlob, "all_alliteration_pairs.xlsx", "Download XLSX");

// Create content for the TXT file
const txtContent = alliterationPairs
    .map(pair => `${pair.alliterationWord} - ${pair.followingWord} (Sentence ${pair.sentenceIndex + 1}): "${inputText.split(/[.!?]/)[pair.sentenceIndex].trim()}"`)
    .join("\n");
const txtBlob = new Blob([txtContent], { type: "text/plain" });
const downloadLinkTXT = createDownloadLink(txtBlob, "all_alliteration_pairs.txt", "Download TXT");

// Create content for the DOCX file
const docxContent = generateDocxContent(inputText, alliterationPairs);
const docxBlob = htmlDocx.asBlob(`<html><body>${docxContent}</body></html>`);
const downloadLinkDOCX = createDownloadLink(docxBlob, "all_alliteration_pairs.docx", "Download DOCX");

// Clear downloadSection and append download links
downloadSection.innerHTML = "";
downloadSection.appendChild(downloadLinkXLSX);
downloadSection.appendChild(document.createTextNode(" "));
downloadSection.appendChild(downloadLinkTXT);
downloadSection.appendChild(document.createTextNode(" "));
downloadSection.appendChild(downloadLinkDOCX);
});
}


function generateDocxContent(text, alliterationPairs) {
    let coloredText = text;

    for (const pair of alliterationPairs) {
        const regex = new RegExp(`\\b${pair.alliterationWord.replace(/[^a-zA-Z]/g, '')}\\b|\\b${pair.followingWord.replace(/[^a-zA-Z]/g, '')}\\b`, 'gi');
        const color = getGroupColor(pair.alliterationWord[0].toUpperCase());
        coloredText = coloredText.replace(regex, `<span style="background-color: ${color};">$&</span>`);
    }

    return coloredText;
}

function createDownloadLink(blob, filename, label) {
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;
    downloadLink.classList.add("download-button");
    downloadLink.textContent = label;

    return downloadLink;
}

function getGroupColor(groupKey) {
// Define base colors with corresponding lightness values
const colorMap = {
A: '#240065', // Dark Indigo
B: '#4B0082', // Indigo
C: '#7363BA', // Light Indigo
D: '#9D96E6', // Very Light Indigo
E: '#800000', // Dark Red
F: '#FF0000', // Red
G: '#FF7373', // Light Red
H: '#FFB6B6', // Very Light Red
I: '#FFA500', // Orange
J: '#FFD700', // Yellow
K: '#00FF00', // Green
L: '#0000FF', // Blue
M: '#8A2BE2', // Violet
N: '#800080', // Purple
O: '#FF00FF', // Magenta
P: '#FFC0CB', // Pink
Q: '#FF7F50', // Coral
R: '#00FFFF', // Cyan
S: '#20B2AA', // Aqua
T: '#E6E6FA', // Lavender
U: '#FF7F00', // Light Orange
V: '#FFFF00', // Light Yellow
W: '#7CFC00', // Light Green
X: '#ADD8E6', // Light Blue
Y: '#EE82EE', // Light Violet
Z: '#9400D3', // Light Purple
};

return colorMap[groupKey.toUpperCase()] || '#808080'; // Default to mid-gray if key not found
}
