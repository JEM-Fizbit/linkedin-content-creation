import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/favorites/:id - Remove favorite
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verify favorite exists
    const checkStmt = db.prepare('SELECT id FROM favorites WHERE id = ?')
    const exists = checkStmt.get(id)

    if (!exists) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 }
      )
    }

    const deleteStmt = db.prepare('DELETE FROM favorites WHERE id = ?')
    deleteStmt.run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting favorite:', error)
    return NextResponse.json(
      { error: 'Failed to delete favorite' },
      { status: 500 }
    )
  }
}
