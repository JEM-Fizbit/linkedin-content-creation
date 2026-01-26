'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, Trash2, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import type { TextZone, CarouselTemplateSlide } from '@/types'

interface TextZoneEditorProps {
  slide: CarouselTemplateSlide
  onUpdate: (zones: TextZone[]) => void
}

const ZONE_TYPES = [
  { id: 'headline', label: 'Headline', color: '#3b82f6' },
  { id: 'body', label: 'Body', color: '#10b981' },
  { id: 'cta', label: 'CTA', color: '#f59e0b' }
] as const

export default function TextZoneEditor({ slide, onUpdate }: TextZoneEditorProps) {
  const [zones, setZones] = useState<TextZone[]>(slide.text_zones || [])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [newZoneType, setNewZoneType] = useState<'headline' | 'body' | 'cta'>('headline')
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // Calculate scale based on container size
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        setScale(containerWidth / 1080)
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const getRelativePosition = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    if (!containerRef.current) return { x: 0, y: 0 }

    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: Math.round((e.clientX - rect.left) / scale),
      y: Math.round((e.clientY - rect.top) / scale)
    }
  }, [scale])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return

    const pos = getRelativePosition(e)
    setIsDrawing(true)
    setDrawStart(pos)
    setSelectedZone(null)
  }, [getRelativePosition])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return

    // Preview drawing is handled via CSS
  }, [isDrawing, drawStart])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) {
      setIsDrawing(false)
      return
    }

    const pos = getRelativePosition(e)

    // Calculate zone dimensions
    const x = Math.min(drawStart.x, pos.x)
    const y = Math.min(drawStart.y, pos.y)
    const width = Math.abs(pos.x - drawStart.x)
    const height = Math.abs(pos.y - drawStart.y)

    // Only create zone if it's large enough
    if (width >= 50 && height >= 30) {
      const zoneColor = ZONE_TYPES.find(t => t.id === newZoneType)?.color || '#3b82f6'

      const newZone: TextZone = {
        id: `zone-${Date.now()}`,
        type: newZoneType,
        x,
        y,
        width,
        height,
        fontSize: newZoneType === 'headline' ? 64 : newZoneType === 'body' ? 32 : 28,
        fontWeight: newZoneType === 'headline' ? 'bold' : 'normal',
        color: '#1a1a1a',
        textAlign: 'center'
      }

      const updatedZones = [...zones, newZone]
      setZones(updatedZones)
      onUpdate(updatedZones)
      setSelectedZone(newZone.id)
    }

    setIsDrawing(false)
    setDrawStart(null)
  }, [isDrawing, drawStart, getRelativePosition, zones, newZoneType, onUpdate])

  const updateZone = useCallback((id: string, updates: Partial<TextZone>) => {
    const updatedZones = zones.map(zone =>
      zone.id === id ? { ...zone, ...updates } : zone
    )
    setZones(updatedZones)
    onUpdate(updatedZones)
  }, [zones, onUpdate])

  const deleteZone = useCallback((id: string) => {
    const updatedZones = zones.filter(zone => zone.id !== id)
    setZones(updatedZones)
    onUpdate(updatedZones)
    setSelectedZone(null)
  }, [zones, onUpdate])

  const selectedZoneData = zones.find(z => z.id === selectedZone)

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Canvas Area */}
      <div className="flex-1">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-gray-600">Draw zone type:</span>
          {ZONE_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setNewZoneType(type.id)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                newZoneType === type.id
                  ? 'text-white border-transparent'
                  : 'text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: newZoneType === type.id ? type.color : undefined
              }}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div
          ref={containerRef}
          className="relative bg-gray-100 rounded-lg overflow-hidden cursor-crosshair select-none"
          style={{
            aspectRatio: '1 / 1',
            maxWidth: '600px',
            backgroundImage: slide.background_data
              ? `url(data:image/png;base64,${slide.background_data})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDrawing(false)
            setDrawStart(null)
          }}
        >
          {/* Existing zones */}
          {zones.map(zone => {
            const zoneType = ZONE_TYPES.find(t => t.id === zone.type)
            return (
              <div
                key={zone.id}
                className={`absolute border-2 rounded cursor-pointer transition-all ${
                  selectedZone === zone.id ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  left: zone.x * scale,
                  top: zone.y * scale,
                  width: zone.width * scale,
                  height: zone.height * scale,
                  borderColor: zoneType?.color || '#3b82f6',
                  backgroundColor: `${zoneType?.color || '#3b82f6'}20`,
                  // Ring color is applied via Tailwind class
                  ['--tw-ring-color' as string]: zoneType?.color
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedZone(zone.id)
                }}
              >
                <div
                  className="absolute -top-6 left-0 px-2 py-0.5 text-xs text-white rounded-t"
                  style={{ backgroundColor: zoneType?.color || '#3b82f6' }}
                >
                  {zoneType?.label}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {zones.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center p-4 bg-white/80 rounded-lg">
                <Type className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Click and drag to define text zones</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone Properties Panel */}
      <div className="w-full lg:w-64 bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Zone Properties</h3>

        {selectedZoneData ? (
          <div className="space-y-4">
            {/* Zone Type */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <select
                value={selectedZoneData.type}
                onChange={(e) => updateZone(selectedZone!, {
                  type: e.target.value as 'headline' | 'body' | 'cta'
                })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {ZONE_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Font Size: {selectedZoneData.fontSize}px
              </label>
              <input
                type="range"
                min="16"
                max="120"
                value={selectedZoneData.fontSize}
                onChange={(e) => updateZone(selectedZone!, {
                  fontSize: parseInt(e.target.value)
                })}
                className="w-full"
              />
            </div>

            {/* Font Weight */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Weight</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateZone(selectedZone!, { fontWeight: 'normal' })}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                    selectedZoneData.fontWeight === 'normal'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => updateZone(selectedZone!, { fontWeight: 'bold' })}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border font-bold ${
                    selectedZoneData.fontWeight === 'bold'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Bold
                </button>
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Text Color</label>
              <input
                type="color"
                value={selectedZoneData.color}
                onChange={(e) => updateZone(selectedZone!, { color: e.target.value })}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Text Alignment */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Alignment</label>
              <div className="flex gap-1">
                {[
                  { value: 'left', icon: AlignLeft },
                  { value: 'center', icon: AlignCenter },
                  { value: 'right', icon: AlignRight }
                ].map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => updateZone(selectedZone!, {
                      textAlign: value as 'left' | 'center' | 'right'
                    })}
                    className={`flex-1 p-2 rounded-lg border ${
                      selectedZoneData.textAlign === value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto" />
                  </button>
                ))}
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={() => deleteZone(selectedZone!)}
              className="w-full px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Zone
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-8">
            <Type className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Select a zone to edit its properties</p>
            <p className="mt-2">or draw a new zone on the slide</p>
          </div>
        )}

        {/* Zone List */}
        {zones.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">All Zones</h4>
            <div className="space-y-1">
              {zones.map(zone => {
                const zoneType = ZONE_TYPES.find(t => t.id === zone.type)
                return (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(zone.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${
                      selectedZone === zone.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: zoneType?.color }}
                    />
                    {zoneType?.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
