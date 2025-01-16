let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let canvas = document.getElementById('pdfCanvas');
let drawCanvas = document.getElementById('drawCanvas');
let ctx = canvas.getContext('2d');
let fabricCanvas = new fabric.Canvas('drawCanvas');
let isEditing = false;

// Cargar PDF
document.getElementById('pdfInput').addEventListener('change', function (event) {
    let file = event.target.files[0];
    if (file) {
        let fileReader = new FileReader();
        fileReader.onload = function () {
            let typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(function (pdfDoc_) {
                pdfDoc = pdfDoc_;
                renderPage(pageNum);
            });
        };
        fileReader.readAsArrayBuffer(file);
    }
});

// Renderizar página
function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(function (page) {
        let viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        drawCanvas.height = viewport.height;
        drawCanvas.width = viewport.width;
        fabricCanvas.setHeight(viewport.height);
        fabricCanvas.setWidth(viewport.width);

        let renderContext = {
            canvasContext: ctx,
            viewport: viewport,
        };
        let renderTask = page.render(renderContext);

        renderTask.promise.then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    document.getElementById('pageNum').textContent = `Página ${num} de ${pdfDoc.numPages}`;
}

// Navegación entre páginas
document.getElementById('prevPage').addEventListener('click', function () {
    if (pageNum <= 1) return;
    pageNum--;
    if (!pageRendering) {
        renderPage(pageNum);
    } else {
        pageNumPending = pageNum;
    }
});

document.getElementById('nextPage').addEventListener('click', function () {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    if (!pageRendering) {
        renderPage(pageNum);
    } else {
        pageNumPending = pageNum;
    }
});

// Editar página
document.getElementById('editPage').addEventListener('click', function () {
    isEditing = !isEditing;
    if (isEditing) {
        fabricCanvas.isDrawingMode = true;
        this.textContent = 'Dejar de Editar';
    } else {
        fabricCanvas.isDrawingMode = false;
        this.textContent = 'Editar Página';
    }
});

// Guardar PDF
document.getElementById('savePdf').addEventListener('click', async function () {
    if (!pdfDoc) return;

    // Obtener el archivo PDF cargado inicialmente
    let file = document.getElementById('pdfInput').files[0];
    if (!file) return;

    // Convertir el canvas de dibujo a una imagen
    let imageBlob = await new Promise((resolve) => {
        fabricCanvas.getElement().toBlob(resolve, 'image/png');
    });

    // Cargar el PDF original usando pdf-lib
    let pdfBytes = await file.arrayBuffer();
    let pdfDocLib = await PDFLib.PDFDocument.load(pdfBytes);

    // Obtener la página actual
    let page = pdfDocLib.getPage(pageNum - 1);

    // Convertir el Blob de la imagen a un objeto Image de pdf-lib
    let image = await pdfDocLib.embedPng(await imageBlob.arrayBuffer());

    // Dibujar la imagen en la página del PDF
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
    });

    // Guardar el PDF modificado
    let modifiedPdfBytes = await pdfDocLib.save();
    let blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

    // Crear un enlace para descargar el PDF editado
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'edited_pdf.pdf';
    link.click();
});