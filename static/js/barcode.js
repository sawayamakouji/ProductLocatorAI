document.getElementById('scanBtn').addEventListener('click', () => {
    const viewport = document.getElementById('interactive');
    viewport.style.display = 'block';

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: viewport,
            constraints: {
                facingMode: "environment"
            },
        },
        decoder: {
            readers: ["ean_reader", "ean_8_reader"]
        }
    }, (err) => {
        if (err) {
            console.error(err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected((result) => {
        const code = result.codeResult.code;
        document.getElementById('searchInput').value = code;
        performSearch(code, 'jan');
        Quagga.stop();
        viewport.style.display = 'none';
    });
});
