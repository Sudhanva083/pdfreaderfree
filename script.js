function readPDF() {
    const fileInput = document.getElementById('pdfUpload');
    const file = fileInput.files[0];
    if (file) {
        resetApplication();  // Clear previous content
        const reader = new FileReader();
        reader.onload = function(event) {
            const typedarray = new Uint8Array(event.target.result);
            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                const pdfViewer = document.getElementById('pdfViewer');
                let pagesPromises = [];
                let textPromises = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    pagesPromises.push(renderPage(i, pdf, pdfViewer));
                    textPromises.push(getPageText(i, pdf));
                }

                Promise.all(textPromises).then(function(pagesText) {
                    const text = pagesText.join(' ');
                    if (text.trim() === '') {
                        // If no text was extracted, perform OCR
                        displayNoteForNonSelectableText();
                        performOCR(pdf, pdfViewer);
                    } else {
                        readAloud(text);
                    }
                }).catch(function(error) {
                    console.error('Error extracting text:', error);
                });
            }).catch(function(error) {
                console.error('Error loading PDF:', error);
            });
        };
        reader.readAsArrayBuffer(file);
    }
}

function readAloud(text) {
    if ('speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        const utterThis = new SpeechSynthesisUtterance(text);
        utterThis.onstart = function(event) {
            console.log('Speech started');
        };
        utterThis.onend = function(event) {
            console.log('Speech ended');
        };
        utterThis.onerror = function(event) {
            console.error('Speech error:', event.error);
        };
        synth.speak(utterThis);
    } else {
        alert("Text-to-Speech is not supported in this browser.");
    }
}
