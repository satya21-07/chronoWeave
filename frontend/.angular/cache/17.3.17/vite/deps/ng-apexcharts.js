import {
  isPlatformBrowser
} from "./chunk-P7QQPZR3.js";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  NgZone,
  Output,
  PLATFORM_ID,
  ViewChild,
  inject,
  setClassMetadata,
  signal,
  ɵɵNgOnChangesFeature,
  ɵɵStandaloneFeature,
  ɵɵdefineComponent,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵelement,
  ɵɵloadQuery,
  ɵɵqueryRefresh,
  ɵɵviewQuery
} from "./chunk-7N2FRCAB.js";
import {
  asapScheduler
} from "./chunk-E5ECCKE6.js";
import {
  __async
} from "./chunk-UKK5MWW6.js";

// node_modules/ng-apexcharts/fesm2022/ng-apexcharts.mjs
var _c0 = ["chart"];
var ChartComponent = class _ChartComponent {
  constructor() {
    this.autoUpdateSeries = true;
    this.chartReady = new EventEmitter();
    this.chartInstance = signal(null);
    this.ngZone = inject(NgZone);
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  }
  ngOnChanges(changes) {
    if (!this.isBrowser) return;
    this.ngZone.runOutsideAngular(() => {
      asapScheduler.schedule(() => this.hydrate(changes));
    });
  }
  ngOnDestroy() {
    this.destroy();
  }
  hydrate(changes) {
    const shouldUpdateSeries = this.autoUpdateSeries && Object.keys(changes).filter((c) => c !== "series").length === 0;
    if (shouldUpdateSeries) {
      this.updateSeries(this.series, true);
      return;
    }
    this.createElement();
  }
  createElement() {
    return __async(this, null, function* () {
      const {
        default: ApexCharts
      } = yield import("./apexcharts.common-24S5XMUL.js");
      window.ApexCharts ||= ApexCharts;
      const options = {};
      if (this.annotations) {
        options.annotations = this.annotations;
      }
      if (this.chart) {
        options.chart = this.chart;
      }
      if (this.colors) {
        options.colors = this.colors;
      }
      if (this.dataLabels) {
        options.dataLabels = this.dataLabels;
      }
      if (this.series) {
        options.series = this.series;
      }
      if (this.stroke) {
        options.stroke = this.stroke;
      }
      if (this.labels) {
        options.labels = this.labels;
      }
      if (this.legend) {
        options.legend = this.legend;
      }
      if (this.fill) {
        options.fill = this.fill;
      }
      if (this.tooltip) {
        options.tooltip = this.tooltip;
      }
      if (this.plotOptions) {
        options.plotOptions = this.plotOptions;
      }
      if (this.responsive) {
        options.responsive = this.responsive;
      }
      if (this.markers) {
        options.markers = this.markers;
      }
      if (this.noData) {
        options.noData = this.noData;
      }
      if (this.xaxis) {
        options.xaxis = this.xaxis;
      }
      if (this.yaxis) {
        options.yaxis = this.yaxis;
      }
      if (this.forecastDataPoints) {
        options.forecastDataPoints = this.forecastDataPoints;
      }
      if (this.grid) {
        options.grid = this.grid;
      }
      if (this.states) {
        options.states = this.states;
      }
      if (this.title) {
        options.title = this.title;
      }
      if (this.subtitle) {
        options.subtitle = this.subtitle;
      }
      if (this.theme) {
        options.theme = this.theme;
      }
      this.destroy();
      const chartInstance = this.ngZone.runOutsideAngular(() => new ApexCharts(this.chartElement.nativeElement, options));
      this.chartInstance.set(chartInstance);
      this.render();
      this.chartReady.emit({
        chartObj: chartInstance
      });
    });
  }
  render() {
    return this.ngZone.runOutsideAngular(() => this.chartInstance()?.render());
  }
  updateOptions(options, redrawPaths, animate, updateSyncedCharts) {
    return this.ngZone.runOutsideAngular(() => this.chartInstance()?.updateOptions(options, redrawPaths, animate, updateSyncedCharts));
  }
  updateSeries(newSeries, animate) {
    return this.ngZone.runOutsideAngular(() => this.chartInstance()?.updateSeries(newSeries, animate));
  }
  appendSeries(newSeries, animate) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.appendSeries(newSeries, animate));
  }
  appendData(newData) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.appendData(newData));
  }
  highlightSeries(seriesName) {
    return this.ngZone.runOutsideAngular(() => this.chartInstance()?.highlightSeries(seriesName));
  }
  toggleSeries(seriesName) {
    return this.ngZone.runOutsideAngular(() => this.chartInstance()?.toggleSeries(seriesName));
  }
  showSeries(seriesName) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.showSeries(seriesName));
  }
  hideSeries(seriesName) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.hideSeries(seriesName));
  }
  resetSeries() {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.resetSeries());
  }
  zoomX(min, max) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.zoomX(min, max));
  }
  toggleDataPointSelection(seriesIndex, dataPointIndex) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.toggleDataPointSelection(seriesIndex, dataPointIndex));
  }
  destroy() {
    this.chartInstance()?.destroy();
    this.chartInstance.set(null);
  }
  setLocale(localeName) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.setLocale(localeName));
  }
  paper() {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.paper());
  }
  addXaxisAnnotation(options, pushToMemory, context) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.addXaxisAnnotation(options, pushToMemory, context));
  }
  addYaxisAnnotation(options, pushToMemory, context) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.addYaxisAnnotation(options, pushToMemory, context));
  }
  addPointAnnotation(options, pushToMemory, context) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.addPointAnnotation(options, pushToMemory, context));
  }
  removeAnnotation(id, options) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.removeAnnotation(id, options));
  }
  clearAnnotations(options) {
    this.ngZone.runOutsideAngular(() => this.chartInstance()?.clearAnnotations(options));
  }
  dataURI(options) {
    return this.chartInstance()?.dataURI(options);
  }
  static {
    this.ɵfac = function ChartComponent_Factory(t) {
      return new (t || _ChartComponent)();
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      type: _ChartComponent,
      selectors: [["apx-chart"]],
      viewQuery: function ChartComponent_Query(rf, ctx) {
        if (rf & 1) {
          ɵɵviewQuery(_c0, 7);
        }
        if (rf & 2) {
          let _t;
          ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.chartElement = _t.first);
        }
      },
      inputs: {
        chart: "chart",
        annotations: "annotations",
        colors: "colors",
        dataLabels: "dataLabels",
        series: "series",
        stroke: "stroke",
        labels: "labels",
        legend: "legend",
        markers: "markers",
        noData: "noData",
        fill: "fill",
        tooltip: "tooltip",
        plotOptions: "plotOptions",
        responsive: "responsive",
        xaxis: "xaxis",
        yaxis: "yaxis",
        forecastDataPoints: "forecastDataPoints",
        grid: "grid",
        states: "states",
        title: "title",
        subtitle: "subtitle",
        theme: "theme",
        autoUpdateSeries: "autoUpdateSeries"
      },
      outputs: {
        chartReady: "chartReady"
      },
      standalone: true,
      features: [ɵɵNgOnChangesFeature, ɵɵStandaloneFeature],
      decls: 2,
      vars: 0,
      consts: [["chart", ""]],
      template: function ChartComponent_Template(rf, ctx) {
        if (rf & 1) {
          ɵɵelement(0, "div", null, 0);
        }
      },
      encapsulation: 2,
      changeDetection: 0
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ChartComponent, [{
    type: Component,
    args: [{
      selector: "apx-chart",
      template: `<div #chart></div>`,
      changeDetection: ChangeDetectionStrategy.OnPush,
      standalone: true
    }]
  }], null, {
    chart: [{
      type: Input
    }],
    annotations: [{
      type: Input
    }],
    colors: [{
      type: Input
    }],
    dataLabels: [{
      type: Input
    }],
    series: [{
      type: Input
    }],
    stroke: [{
      type: Input
    }],
    labels: [{
      type: Input
    }],
    legend: [{
      type: Input
    }],
    markers: [{
      type: Input
    }],
    noData: [{
      type: Input
    }],
    fill: [{
      type: Input
    }],
    tooltip: [{
      type: Input
    }],
    plotOptions: [{
      type: Input
    }],
    responsive: [{
      type: Input
    }],
    xaxis: [{
      type: Input
    }],
    yaxis: [{
      type: Input
    }],
    forecastDataPoints: [{
      type: Input
    }],
    grid: [{
      type: Input
    }],
    states: [{
      type: Input
    }],
    title: [{
      type: Input
    }],
    subtitle: [{
      type: Input
    }],
    theme: [{
      type: Input
    }],
    autoUpdateSeries: [{
      type: Input
    }],
    chartReady: [{
      type: Output
    }],
    chartElement: [{
      type: ViewChild,
      args: ["chart", {
        static: true
      }]
    }]
  });
})();
var declarations = [ChartComponent];
var NgApexchartsModule = class _NgApexchartsModule {
  static {
    this.ɵfac = function NgApexchartsModule_Factory(t) {
      return new (t || _NgApexchartsModule)();
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _NgApexchartsModule,
      imports: [ChartComponent],
      exports: [ChartComponent]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({});
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgApexchartsModule, [{
    type: NgModule,
    args: [{
      imports: [declarations],
      exports: [declarations]
    }]
  }], null, null);
})();
export {
  ChartComponent,
  NgApexchartsModule
};
//# sourceMappingURL=ng-apexcharts.js.map
