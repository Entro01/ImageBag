// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export enum StatusCodes {
  OK = 200,
  BAD_REQUEST = 400,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  REQUEST_TOO_LONG = 413,
  INTERNAL_SERVER_ERROR = 500,
}

export enum RequestTypes {
  DEFAULT = "Default",
  CUSTOM = "Custom",
  THUMBOR = "Thumbor",
}

export enum ImageFormatTypes {
  JPG = "jpg",
  JPEG = "jpeg",
  PNG = "png",
  WEBP = "webp",
  TIFF = "tiff",
  HEIF = "heif",
  HEIC = "heic",
  RAW = "raw",
  GIF = "gif",
}

export enum ImageFitTypes {
  COVER = "cover",
  CONTAIN = "contain",
  FILL = "fill",
  INSIDE = "inside",
  OUTSIDE = "outside",
}

export enum ContentTypes {
  PNG = "image/png",
  JPEG = "image/jpeg",
  WEBP = "image/webp",
  TIFF = "image/tiff",
  GIF = "image/gif",
  SVG = "image/svg+xml",
}

export enum ImagePositionTypes {
  CENTER = "centre",
  CENTRE = "centre",
  TOP = "top",
  RIGHT_TOP = "right top",
  RIGHT = "right",
  RIGHT_BOTTOM = "right bottom",
  BOTTOM = "bottom",
  LEFT_BOTTOM = "left bottom",
  LEFT = "left",
  LEFT_TOP = "left top"
}