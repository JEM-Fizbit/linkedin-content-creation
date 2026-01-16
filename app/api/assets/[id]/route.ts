import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { ProjectAsset } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/assets/:id - Get a specific asset with its data
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const stmt = db.prepare(`
      SELECT id, project_id, type, filename, mime_type, data, created_at
      FROM project_assets
      WHERE id = ?
    `)

    const row = stmt.get(id) as {
      id: string
      project_id: string
      type: string
      filename: string
      mime_type: string
      data: Buffer
      created_at: string
    } | undefined

    if (!row) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    const asset: ProjectAsset = {
      id: row.id,
      project_id: row.project_id,
      type: row.type as ProjectAsset['type'],
      filename: row.filename,
      mime_type: row.mime_type,
      data: row.data.toString('base64'),
      created_at: row.created_at,
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error fetching asset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    )
  }
}

// DELETE /api/assets/:id - Delete an asset
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verify asset exists
    const checkStmt = db.prepare('SELECT id FROM project_assets WHERE id = ?')
    const exists = checkStmt.get(id)

    if (!exists) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    const deleteStmt = db.prepare('DELETE FROM project_assets WHERE id = ?')
    deleteStmt.run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting asset:', error)
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    )
  }
}
