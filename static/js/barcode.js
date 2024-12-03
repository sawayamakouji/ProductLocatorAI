let isScannerActive = false;

document.getElementById('scanBtn').addEventListener('click', () => {
    const viewport = document.getElementById('interactive');
    const scanBtn = document.getElementById('scanBtn');

    if (isScannerActive) {
        // Stop scanner
        Quagga.stop();
        viewport.style.display = 'none';
        scanBtn.textContent = 'バーコードスキャン';
        isScannerActive = false;
    } else {
        // Start scanner
        viewport.style.display = 'block';
        scanBtn.textContent = 'バーコードスキャン停止';
        
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
                viewport.style.display = 'none';
                scanBtn.textContent = 'バーコードスキャン';
                return;
            }
            Quagga.start();
            isScannerActive = true;
        });
    }
});

Quagga.onDetected((result) => {
    const code = result.codeResult.code;
    document.getElementById('searchInput').value = code;
    performSearch(code, 'jan');
    Quagga.stop();
    document.getElementById('interactive').style.display = 'none';
    document.getElementById('scanBtn').textContent = 'バーコードスキャン';
    isScannerActive = false;
});
