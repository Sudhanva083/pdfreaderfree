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

function resetApplication() {
    const pdfViewer = document.getElementById('pdfViewer');
    pdfViewer.innerHTML = '';  // Clear the PDF viewer
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();  // Stop any ongoing speech
    }
    removeNoteForNonSelectableText();
}

function displayNoteForNonSelectableText() {
    const note = document.getElementById('note');
    note.textContent = 'The PDF does not contain selectable text. Performing OCR to read the text.';
    note.style.color = 'white';  // Optional: change color to highlight the message
}

function removeNoteForNonSelectableText() {
    const note = document.getElementById('note');
    note.textContent = 'Please select a PDF with selectable text.';
    note.style.color = '#ffffff';  // Optional: reset color to default
}

function getPageText(pageNum, pdf) {
    return pdf.getPage(pageNum).then(function(page) {
        return page.getTextContent().then(function(textContent) {
            return textContent.items.map(function(item) {
                return item.str;
            }).join(' ');
        });
    });
}

function renderPage(pageNum, pdf, pdfViewer) {
    return pdf.getPage(pageNum).then(function(page) {
        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        return page.render(renderContext).promise.then(function() {
            const wrapper = document.createElement('div');
            wrapper.className = 'page';
            wrapper.appendChild(canvas);
            pdfViewer.appendChild(wrapper);
        });
    });
}

function performOCR(pdf, pdfViewer) {
    let pagesPromises = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        pagesPromises.push(performOCROnPage(i, pdf));
    }
    Promise.all(pagesPromises).then(function(pagesText) {
        const text = pagesText.join(' ');
        readAloud(text);
    }).catch(function(error) {
        console.error('Error performing OCR:', error);
    });
}

function performOCROnPage(pageNum, pdf) {
    return pdf.getPage(pageNum).then(function(page) {
        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        return page.render(renderContext).promise.then(function() {
            return Tesseract.recognize(canvas.toDataURL(), 'eng')
                .then(function(result) {
                    return result.data.text;
                });
        });
    });
}

function readAloud(text) {
    const synth = window.speechSynthesis;
    const utterThis = new SpeechSynthesisUtterance(text);
    synth.speak(utterThis);
}
