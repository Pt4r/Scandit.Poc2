import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import * as SDCCore from 'scandit-web-datacapture-core';
import * as SDCBarcode from 'scandit-web-datacapture-barcode';
import { ModalDismissReasons, NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss']
})
export class ScannerComponent implements OnInit {
  public barcodes: SDCBarcode.Barcode[] = [];
  public outputSkus: string[] = [];
  private barcodeCapture?: SDCBarcode.BarcodeCapture = undefined;

  constructor(private modalService: NgbModal) { }

  async ngOnInit(): Promise<void> {

  }

  async initializeScanner() {
    const view = new SDCCore.DataCaptureView();

    view.connectToElement(document.getElementById("data-capture-view")!);
    view.showProgressBar();
    view.setProgressBarMessage("Loading ...");

    await SDCCore.configure({
      licenseKey: environment.apiKey,
      libraryLocation: "https://cdn.jsdelivr.net/npm/scandit-web-datacapture-barcode@6.x/build/engine/",
      moduleLoaders: [SDCBarcode.barcodeCaptureLoader()]
    });

    view.hideProgressBar();

    const context = await SDCCore.DataCaptureContext.create();

    const camera = SDCCore.Camera.default;
    await context.setFrameSource(camera);
    camera.settings.focusGestureStrategy = SDCCore.FocusGestureStrategy.AutoOnLocation;

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
    settings.codeDuplicateFilter = -1;

    const symbologySetting = settings.settingsForSymbology(SDCBarcode.Symbology.Code39);
    symbologySetting.activeSymbolCounts = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    this.barcodeCapture = await SDCBarcode.BarcodeCapture.forContext(context, settings);
    await this.barcodeCapture.setEnabled(false);

    this.barcodeCapture.addListener({
      didScan: async (barcodeCapture, session) => {
        // await barcodeCapture.setEnabled(false);
        const barcode = session.newlyRecognizedBarcodes[0];
        const symbology = new SDCBarcode.SymbologyDescription(barcode.symbology);
        this.barcodes.push(session.newlyRecognizedBarcodes[0]);
        // alert("Scanned: " + barcode.data + " " + symbology.readableName);
        // await barcodeCapture.setEnabled(true);
      }
    });

    view.setContext(context);
    view.connectToElement(document.getElementById("data-capture-view")!);
    view.addControl(new SDCCore.CameraSwitchControl());

    const barcodeCaptureOverlay =
      await SDCBarcode.BarcodeCaptureOverlay.withBarcodeCaptureForViewWithStyle(
        this.barcodeCapture,
        view,
        SDCBarcode.BarcodeCaptureOverlayStyle.Frame
      );

    const viewfinder = new SDCCore.RectangularViewfinder(
      SDCCore.RectangularViewfinderStyle.Square,
      SDCCore.RectangularViewfinderLineStyle.Light
    );
    await barcodeCaptureOverlay.setViewfinder(viewfinder);

    await camera.switchToDesiredState(SDCCore.FrameSourceState.On);
    await this.barcodeCapture.setEnabled(true);
  }

  open(content: any) {
    const modalRef = this.modalService.open(content, {
      ariaLabelledBy: 'modal-basic-title',
      size: 'xl',
    });

    modalRef.shown.subscribe(async () => {
      await this.initializeScanner();
    });

    modalRef.result.then((result:any) => {
      this.outputSkus = this.barcodes.filter(x => x.data != null).map((barcode) => barcode.data!.toString());
      this.barcodes = [];
      this.barcodeCapture?.setEnabled(false);
    },
    (reason:any) => {
      this.barcodes = [];
      this.barcodeCapture?.setEnabled(false);
    });
  }
}
