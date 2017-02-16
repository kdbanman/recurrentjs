
var WeightsComponent = function (options) {

  this.pixelSize = options.pixelSize || 10;
  this.positiveActivationHue = options.positiveActivationHue || 190;
  this.negativeActivationHue = options.negativeActivationHue || 6;
  this.positiveActivationSaturation = options.positiveActivationSaturation || 100;
  this.negativeActivationSaturation = options.negativeActivationSaturation || 70;
  this.fullActivationBrightness = options.fullActivationBrightness || 70;

  this.parentElement = options.parentElement;

  this.setNewModel(options.model);
}

WeightsComponent.prototype = {
  setNewModel: function (model) {
    var self = this;
    self.model = model;

    if (self.keys) {
      self.keys.forEach(function (key) {
        self.canvases[key].remove();
        self.oldMats[key] = undefined;
      });
    }

    self.canvases = {};
    self.oldMats = {};
    self.keys = Object.keys(self.model);

    self.keys.forEach(function (key) {
      var mat = self.model[key];
      self.oldMats[key] = mat;

      var rowCount = mat.n;
      var colCount = mat.d;

      var canvas = document.createElement('canvas');
      canvas.height = rowCount * self.pixelSize;
      canvas.width = colCount * self.pixelSize;

      self.parentElement.append(canvas);

      self.canvases[key] = canvas;
    });
    this.render();
  },
  render: function () {
    var self = this;
    this.keys.forEach(function (key) {
      var mat = self.model[key];
      var oldMat = self.oldMats[key];
      var weightDiffMat = undefined;
      var ctx = self.canvases[key].getContext('2d');

      var minmaxWeightIndices = R.minmaxi(mat.w);
      var minWeight = mat.w[minmaxWeightIndices[0]];
      var maxWeight = mat.w[minmaxWeightIndices[1]];

      if (oldMat != null) {
        // TODO G.sub is not a function
        // var G = new R.Graph(false);
        // weightDiffMat = G.sub(oldMat, mat);
        // var minmaxWeightDiffIndices = R.minmaxi(weightDiffMat);
        // var minWeightDiff = weightDiffMat[minmaxWeightDiffIndices[0]];
        // var maxWeightDiff = weightDiffMat[minmaxWeightDiffIndices[1]];
      }

      for (var row = 0; row < mat.n; row++) {
        for (var col = 0; col < mat.d; col++) {
          var weight = mat.get(row, col);

          ctx.fillStyle = self.getActivationColor(minWeight, maxWeight, weight);
          ctx.fillRect(col * self.pixelSize, row * self.pixelSize, self.pixelSize, self.pixelSize);

          if (weightDiffMat != null) {

            var weightDiff = weightDiffMat.get(row, col);

            // TODO compute stroke color from min and max
            // ctx.lineWidth = 1;
            // ctx.strokeStyle = 'rgb(255,255,255)';
            // ctx.strokeRect(col * self.pixelSize, row * self.pixelSize, self.pixelSize, self.pixelSize);
          }
        }
      }

      self.oldMats[key] = mat;
    });
  },
  getActivationColor: function (min, max, weight) {
    var hue, saturation, lightness;
    if (weight < 0) {
      hue = this.negativeActivationHue;
      saturation = this.negativeActivationSaturation;
    } else {
      hue = this.positiveActivationHue;
      saturation = this.negativeActivationSaturation;
    }

    if (min * max > 0) {
      // signs are the same.
      lightness = this.fullActivationBrightness * (max - weight) / (max - min);
    } else {
      // signs differ: min is negative and max is positive.
      var maxDisplacement = max > -1 * min ? max : -1 * min;
      var absoluteWeight = weight > 0 ? weight : -1 * weight;
      lightness = this.fullActivationBrightness * absoluteWeight / maxDisplacement;
    }

    // round to nearest tenth
    lightness = Math.round(lightness * 10) / 10;

    return 'hsl(' + hue + ',' + saturation + '%,' + lightness + '%)';
  }
}
