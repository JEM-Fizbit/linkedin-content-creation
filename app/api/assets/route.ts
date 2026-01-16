import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { ProjectAsset, UploadAssetRequest, AssetType } from '@/types'

// POST /api/assets - Upload a new asset (reference image, logo, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as UploadAssetRequest
    const { project_id, type, filename, mime_type, data } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    if (!type || !['reference_image', 'logo', 'icon', 'other'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type is required (reference_image, logo, icon, or other)' },
        { status: 400 }
      )
    }

    if (!filename) {
      return NextResponse.json(
        { error: 'filename is required' },
        { status: 400 }
      )
    }

    if (!mime_type) {
      return NextResponse.json(
        { error: 'mime_type is required' },
        { status: 400 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'data (base64) is required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const projectStmt = db.prepare('SELECT id FROM projects WHERE id = ?')
    const project = projectStmt.get(project_id)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Convert base64 to Buffer for storage
    const dataBuffer = Buffer.from(data, 'base64')

    const assetId = generateId()
    const now = new Date().toISOString()

    const insertStmt = db.prepare(`
      INSERT INTO project_assets (id, project_id, type, filename, mime_type, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    insertStmt.run(assetId, project_id, type, filename, mime_type, dataBuffer, now)

    const asset: ProjectAsset = {
      id: assetId,
      project_id,
      type: type as AssetType,
      filename,
      mime_type,
      created_at: now,
    }

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Error uploading asset:', error)
    return NextResponse.json(
      { error: 'Failed to upload asset' },
      { status: 500 }
    )
  }
}

// GET /api/assets - Get assets for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const type = searchParams.get('type') as AssetType | null

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    let query = 'SELECT id, project_id, type, filename, mime_type, created_at FROM project_assets WHERE project_id = ?'
    const params: string[] = [projectId]

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    query += ' ORDER BY created_at DESC'

    const stmt = db.prepare(query)
    const assets = stmt.all(...params) as Omit<ProjectAsset, 'data'>[]

    return NextResponse.json(assets)
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}
