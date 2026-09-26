export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => {
      // Retry without crossOrigin attribute in case CORS header is missing
      const fallback = new Image()
      fallback.onload = () => resolve(fallback)
      fallback.onerror = (e) => reject(e)
      fallback.src = url
    }
    image.src = url
  })

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

/**
 * Fast, memory-safe crop generator using direct canvas slicing
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const rotRad = getRadianAngle(rotation)

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  // set canvas size to match the bounding box
  canvas.width = Math.max(1, Math.round(bBoxWidth))
  canvas.height = Math.max(1, Math.round(bBoxHeight))

  // translate canvas context to a central point to allow rotating and flipping around the center
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rotRad)
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)

  // draw rotated image
  ctx.drawImage(image, 0, 0)

  // Create cropped output canvas directly via drawImage (avoids heavy getImageData memory buffers)
  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = Math.max(1, Math.round(pixelCrop.width))
  resultCanvas.height = Math.max(1, Math.round(pixelCrop.height))
  const resultCtx = resultCanvas.getContext('2d')

  if (!resultCtx) {
    return null
  }

  resultCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    try {
      resultCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            try {
              const dataUrl = resultCanvas.toDataURL('image/jpeg', 0.92)
              const byteString = atob(dataUrl.split(',')[1])
              const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0]
              const ab = new ArrayBuffer(byteString.length)
              const ia = new Uint8Array(ab)
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i)
              }
              resolve(new Blob([ab], { type: mimeString }))
            } catch (err) {
              reject(err)
            }
          }
        },
        'image/jpeg',
        0.92
      )
    } catch (err) {
      reject(err)
    }
  })
}
