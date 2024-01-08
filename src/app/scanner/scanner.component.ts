import { Component, OnInit } from '@angular/core';
import {environment } from '../../environments/environment';
import * as SDCCore from 'scandit-web-datacapture-core';
import * as SDCBarcode from 'scandit-web-datacapture-barcode';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss']
})
export class ScannerComponent implements OnInit {
  constructor() { }

  async ngOnInit(): Promise<void> {
    const view = new SDCCore.DataCaptureView();

    view.connectToElement(document.getElementById("data-capture-view")!);
    view.showProgressBar();
    view.setProgressBarMessage("Loading ...");

    await SDCCore.configure({
      licenseKey: environment.apiKey,
      libraryLocation: new URL("./assets/library/engine/", document.baseURI).toString(),
      moduleLoaders: [SDCBarcode.barcodeCaptureLoader()]
    });

    view.hideProgressBar();

    const context = await SDCCore.DataCaptureContext.create();

    const camera = SDCCore.Camera.default;
    await context.setFrameSource(camera);

    const settings = new SDCBarcode.BarcodeCaptureSettings();
    settings.enableSymbologies([
      SDCBarcode.Symbology.Code128,
      SDCBarcode.Symbology.Code39,
      SDCBarcode.Symbology.Code32,
      SDCBarcode.Symbology.QR,
      SDCBarcode.Symbology.EAN8,
      SDCBarcode.Symbology.UPCE,
      SDCBarcode.Symbology.EAN13UPCA,
      SDCBarcode.Symbology.QR
    ]);

    const symbologySetting = settings.settingsForSymbology(SDCBarcode.Symbology.Code39);
    symbologySetting.activeSymbolCounts = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    const barcodeCapture = await SDCBarcode.BarcodeCapture.forContext(context, settings);
    await barcodeCapture.setEnabled(false);

    barcodeCapture.addListener({
      didScan: async (barcodeCapture, session) => {
        await barcodeCapture.setEnabled(false);
        const barcode = session.newlyRecognizedBarcodes[0];
        const symbology = new SDCBarcode.SymbologyDescription(barcode.symbology);
        alert("Scanned: " + barcode.data + " " + symbology.readableName);
        await barcodeCapture.setEnabled(true);
      },
    });


    view.setContext(context);
    view.connectToElement(document.getElementById("data-capture-view")!);
    view.addControl(new SDCCore.CameraSwitchControl());

    const barcodeCaptureOverlay =
      await SDCBarcode.BarcodeCaptureOverlay.withBarcodeCaptureForViewWithStyle(
        barcodeCapture,
        view,
        SDCBarcode.BarcodeCaptureOverlayStyle.Frame
      );

    const viewfinder = new SDCCore.RectangularViewfinder(
      SDCCore.RectangularViewfinderStyle.Square,
      SDCCore.RectangularViewfinderLineStyle.Light
    );
    await barcodeCaptureOverlay.setViewfinder(viewfinder);

    await camera.switchToDesiredState(SDCCore.FrameSourceState.On);
    await barcodeCapture.setEnabled(true);
  }
}
