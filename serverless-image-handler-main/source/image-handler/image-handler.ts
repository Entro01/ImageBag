// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Rekognition from "aws-sdk/clients/rekognition";
import S3 from "aws-sdk/clients/s3";
import sharp, { FormatEnum, OverlayOptions, ResizeOptions } from "sharp";

import {
  BoundingBox,
  BoxSize,
  ContentTypes,
  ImageEdits,
  ImageFitTypes,
  ImageFormatTypes,
  ImageHandlerError,
  ImageRequestInfo,
  RekognitionCompatibleImage,
  StatusCodes,
} from "./lib";

export class ImageHandler {
  private readonly LAMBDA_PAYLOAD_LIMIT = 6 * 1024 * 1024;

  constructor(private readonly s3Client: S3, private readonly rekognitionClient: Rekognition) { }

  /**
   * Creates a Sharp object from Buffer
   * @param originalImage An image buffer.
   * @param edits The edits to be applied to an image
   * @param options Additional sharp options to be applied
   * @returns A Sharp image object
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  private async instantiateSharpImage(originalImage: Buffer, edits: ImageEdits, options: Object): Promise<sharp.Sharp> {
    let image: sharp.Sharp = null;
    image = sharp(originalImage, options);
    return image;
  }

  /**
   * Modify an image's output format if specified
   * @param modifiedImage the image object.
   * @param imageRequestInfo the image request
   * @returns A Sharp image object
   */
  private modifyImageOutput(modifiedImage: sharp.Sharp, imageRequestInfo: ImageRequestInfo): sharp.Sharp {
    if (imageRequestInfo.outputFormat !== undefined) {
      if (imageRequestInfo.outputFormat === ImageFormatTypes.WEBP && typeof imageRequestInfo.effort !== "undefined") {
        return modifiedImage.webp({ effort: imageRequestInfo.effort });
      }
    } else {
      // Default to WebP if no output format is specified
      return modifiedImage.webp({ effort: 4, quality: 80 }); // You can adjust these default values
    }
  }

  /**
   * Main method for processing image requests and outputting modified images.
   * @param imageRequestInfo An image request.
   * @returns Processed and modified image encoded as base64 string.
   */
  async process(imageRequestInfo: ImageRequestInfo): Promise<string> {
    const { originalImage, edits } = imageRequestInfo;
    const options = { failOnError: false, animated: imageRequestInfo.contentType === ContentTypes.GIF };
    let base64EncodedImage = "";
  
    // Apply edits if specified
    if (edits && Object.keys(edits).length) {
      let image = await this.instantiateSharpImage(originalImage, edits, options);
  
      if (options.animated) {
        const metadata = await image.metadata();
        if (!metadata.pages || metadata.pages <= 1) {
          options.animated = false;
          image = await this.instantiateSharpImage(originalImage, edits, options);
        }
      }
  
      let modifiedImage = await this.applyEdits(image, edits, options.animated);
      modifiedImage = this.modifyImageOutput(modifiedImage, imageRequestInfo);
  
      const imageBuffer = await modifiedImage.toBuffer();
      base64EncodedImage = imageBuffer.toString("base64");
    } else {
      const modifiedImage = this.modifyImageOutput(sharp(originalImage, options), imageRequestInfo);
      const imageBuffer = await modifiedImage.toBuffer();
      base64EncodedImage = imageBuffer.toString("base64");
    }
  
    if (base64EncodedImage.length > this.LAMBDA_PAYLOAD_LIMIT) {
      throw new ImageHandlerError(
        StatusCodes.REQUEST_TOO_LONG,
        "TooLargeImageException",
        "The converted image is too large to return."
      );
    }
  
    return base64EncodedImage;
  }
  /**
   * Applies image modifications to the original image based on edits.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   * @param isAnimation a flag whether the edit applies to `gif` file or not.
   * @returns A modifications to the original image.
   */
  public async applyEdits(originalImage: sharp.Sharp, edits: ImageEdits, isAnimation: boolean): Promise<sharp.Sharp> {
    await this.applyResize(originalImage, edits);

    // Apply the image edits
    for (const edit in edits) {

      switch (edit) {
        case "roundCrop": {
          originalImage = await this.applyRoundCrop(originalImage, edits);
          break;
        }
        case "crop": {
          this.applyCrop(originalImage, edits);
          break;
        }
        default: {
          if (edit in originalImage) {
            originalImage[edit](edits[edit]);
          }
        }
      }
    }
    // Return the modified image
    return originalImage;
  }

  /**
   * Applies resize edit.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   */
  private async applyResize(originalImage: sharp.Sharp, edits: ImageEdits): Promise<void> {
    if (edits.resize === undefined) {
      edits.resize = {};
      edits.resize.fit = ImageFitTypes.INSIDE;
    } else {
      if (edits.resize.width) edits.resize.width = Math.round(Number(edits.resize.width));
      if (edits.resize.height) edits.resize.height = Math.round(Number(edits.resize.height));
      if (edits.resize.ratio) {
        const ratio = edits.resize.ratio;
        const { width, height } =
          edits.resize.width && edits.resize.height ? edits.resize : await originalImage.metadata();
        edits.resize.width = Math.round(width * ratio);
        edits.resize.height = Math.round(height * ratio);
        // Sharp doesn't have such parameter for resize(), we got it from Thumbor mapper.  We don't need to keep this field in the `resize` object
        delete edits.resize.ratio;
        if (!edits.resize.fit) edits.resize.fit = ImageFitTypes.INSIDE;
      }
      
      // Validate position parameter - only apply for cover or contain fit types
      if (edits.resize.position && 
          (edits.resize.fit === ImageFitTypes.COVER || edits.resize.fit === ImageFitTypes.CONTAIN)) {
        // Position is already in the correct format for Sharp
        // Nothing more to do here, Sharp will use the position as provided
      } else if (edits.resize.fit === ImageFitTypes.COVER || edits.resize.fit === ImageFitTypes.CONTAIN) {
        // If fit is cover or contain but no position specified, default to center/centre
        edits.resize.position = 'centre';
      }
    }
  }

  /**
   *
   * @param editSize the specified size
   * @param imageSize the size of the image
   * @param overlaySize the size of the overlay
   * @returns the calculated size
   */
  private calcOverlaySizeOption = (editSize: string | undefined, imageSize: number, overlaySize: number): number => {
    let resultSize = NaN;

    if (editSize !== undefined) {
      // if ends with p, it is a percentage
      if (editSize.endsWith("p")) {
        resultSize = parseInt(editSize.replace("p", ""));
        resultSize = Math.floor(
          resultSize < 0 ? imageSize + (imageSize * resultSize) / 100 - overlaySize : (imageSize * resultSize) / 100
        );
      } else {
        resultSize = parseInt(editSize);
        if (resultSize < 0) {
          resultSize = imageSize + resultSize - overlaySize;
        }
      }
    }

    return resultSize;
  };


  /**
   * Determines if the edits specified contain a valid roundCrop item
   * @param edits The edits speficed
   * @returns boolean
   */
  private hasRoundCrop(edits: ImageEdits): boolean {
    return edits.roundCrop === true || typeof edits.roundCrop === "object";
  }

  /**
   * @param param Value of corner to check
   * @returns Boolean identifying whether roundCrop parameters are valid
   */
  private validRoundCropParam(param: number) {
    return param && param >= 0;
  }

  /**
   * Applies round crop edit.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   */
  private async applyRoundCrop(originalImage: sharp.Sharp, edits: ImageEdits): Promise<sharp.Sharp> {
    // round crop can be boolean or object
    if (this.hasRoundCrop(edits)) {
      const { top, left, rx, ry } =
        typeof edits.roundCrop === "object"
          ? edits.roundCrop
          : {
            top: undefined,
            left: undefined,
            rx: undefined,
            ry: undefined,
          };
      const imageBuffer = await originalImage.toBuffer({ resolveWithObject: true });
      const width = imageBuffer.info.width;
      const height = imageBuffer.info.height;

      // check for parameters, if not provided, set to defaults
      const radiusX = this.validRoundCropParam(rx) ? rx : Math.min(width, height) / 2;
      const radiusY = this.validRoundCropParam(ry) ? ry : Math.min(width, height) / 2;
      const topOffset = this.validRoundCropParam(top) ? top : height / 2;
      const leftOffset = this.validRoundCropParam(left) ? left : width / 2;

      const ellipse = Buffer.from(
        `<svg viewBox="0 0 ${width} ${height}"> <ellipse cx="${leftOffset}" cy="${topOffset}" rx="${radiusX}" ry="${radiusY}" /></svg>`
      );
      const overlayOptions: OverlayOptions[] = [{ input: ellipse, blend: "dest-in" }];

      // Need to break out into another sharp pipeline to allow for resize after composite
      const data = await originalImage.composite(overlayOptions).toBuffer();
      return sharp(data).trim();
    }

    return originalImage;
  }

  /**
   * Blurs the image provided if there is inappropriate content
   * @param originalImage the original image
   * @param blur the amount to blur
   * @param moderationLabels the labels identifying specific content to blur
   * @param foundContentLabels the labels identifying inappropriate content found
   */
  private blurImage(
    originalImage: sharp.Sharp,
    blur: number | undefined,
    moderationLabels: string[],
    foundContentLabels: Rekognition.DetectModerationLabelsResponse
  ): void {
    const blurValue = blur !== undefined ? Math.ceil(blur) : 50;

    if (blurValue >= 0.3 && blurValue <= 1000) {
      if (moderationLabels) {
        for (const moderationLabel of foundContentLabels.ModerationLabels) {
          if (moderationLabels.includes(moderationLabel.Name)) {
            originalImage.blur(blurValue);
            break;
          }
        }
      } else if (foundContentLabels.ModerationLabels.length) {
        originalImage.blur(blurValue);
      }
    }
  }

  /**
   * Applies crop edit.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   */
  private applyCrop(originalImage: sharp.Sharp, edits: ImageEdits): void {
    try {
      originalImage.extract(edits.crop);
    } catch (error) {
      throw new ImageHandlerError(
        StatusCodes.BAD_REQUEST,
        "Crop::AreaOutOfBounds",
        "The cropping area you provided exceeds the boundaries of the original image. Please try choosing a correct cropping value."
      );
    }
  }

}
