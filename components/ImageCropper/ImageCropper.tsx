"use client"

import React, { useState, useCallback, useRef } from 'react'
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/lib/cropImage'
import { ZoomIn, RotateCcw, Check, X, Sparkles, Loader2, ImagePlus } from 'lucide-react'
import { removeBackground } from '@imgly/background-removal'
import { toast } from 'sonner'

interface Props {
  src: string
  onCancel: () => void
  onCropped: (blob: Blob) => void
  aspect?: number
  cropShape?: 'rect' | 'round'
}

const ImageCropper = ({ 
  src: initialSrc, 
  onCancel, 
  onCropped, 
  aspect = 3 / 4, 
  cropShape = 'rect' 
}: Props) => {
  const [imageSrc, setImageSrc] = useState(initialSrc)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isRemovingBG, setIsRemovingBG] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleNewPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(String(reader.result))
        setZoom(1)
        setRotation(0)
        setCrop({ x: 0, y: 0 })
      }
      reader.readAsDataURL(file)
    }
    // Reset so same file can be selected again
    e.target.value = ''
  }

  const handleRemoveBackground = async () => {
    setIsRemovingBG(true)
    const toastId = toast.loading('Removing background...', { description: 'Please wait...' })
    try {
      const blob = await removeBackground(imageSrc, {
        progress: (_status, progress) => {
          const percent = Math.min(100, Math.max(0, Math.round(progress * 100)))
          toast.loading('Removing background...', { id: toastId, description: `${percent}% complete` })
        },
        model: 'isnet',
        output: { format: 'image/png', quality: 0.95 }
      })

      const img = new Image()
      const url = URL.createObjectURL(blob)
      img.src = url
      await new Promise((resolve) => (img.onload = resolve))

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      setImageSrc(canvas.toDataURL('image/jpeg', 0.95))
      URL.revokeObjectURL(url)
      toast.success('Background removed!', { id: toastId })
    } catch {
      toast.error('Could not remove background.', { id: toastId })
    } finally {
      setIsRemovingBG(false)
    }
  }

  const handleDone = async () => {
    if (!croppedAreaPixels) {
      toast.error('Please adjust the crop area first')
      return
    }
    setLoading(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      if (croppedBlob) {
        onCropped(croppedBlob)
      } else {
        toast.error('Could not generate cropped image')
      }
    } catch (e: any) {
      console.error('Crop error:', e)
      toast.error(e?.message || 'Error processing crop. Please try another image.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col w-full">
      {/* Hidden file input for new photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleNewPhoto}
      />

      {/* Image Area */}
      <div className="relative w-full h-[300px] sm:h-[360px] bg-neutral-900">
        <Cropper
          image={imageSrc}
          crop={crop}
          rotation={rotation}
          zoom={zoom}
          aspect={aspect}
          cropShape={cropShape}
          showGrid={true}
          onCropChange={setCrop}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-neutral-900 p-3 sm:p-4 space-y-3">
        {/* Sliders */}
        <div className="flex items-center gap-3">
          <ZoomIn size={15} className="text-neutral-400 shrink-0" />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.01}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex items-center gap-1 w-12 justify-end">
            <input
              type="number"
              value={Math.round(zoom * 100)}
              min={100}
              max={300}
              onChange={(e) => {
                const val = Number(e.target.value)
                if (!isNaN(val)) setZoom(Math.min(3, Math.max(1, val / 100)))
              }}
              className="w-full text-[11px] text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-blue-500 focus:outline-none text-right tabular-nums font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[10px] text-neutral-400">%</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RotateCcw size={15} className="text-neutral-400 shrink-0" />
          <input
            type="range"
            value={rotation}
            min={0}
            max={360}
            step={1}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex items-center gap-1 w-12 justify-end">
            <input
              type="number"
              value={rotation}
              min={0}
              max={360}
              onChange={(e) => {
                const val = Number(e.target.value)
                if (!isNaN(val)) setRotation(Math.min(360, Math.max(0, val)))
              }}
              className="w-full text-[11px] text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-blue-500 focus:outline-none text-right tabular-nums font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[10px] text-neutral-400">°</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRemoveBackground}
            disabled={isRemovingBG}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isRemovingBG ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            White BG
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <ImagePlus size={14} />
            New Photo
          </button>

          <div className="flex-1" />

          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={14} />
            Cancel
          </button>

          <button
            onClick={handleDone}
            disabled={loading || isRemovingBG}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImageCropper
