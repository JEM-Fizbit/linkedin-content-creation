import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { Favorite, FavoriteType } from '@/types'

// GET /api/favorites - List all favorites with optional type filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as FavoriteType | null

    let query = 'SELECT * FROM favorites'
    const params: string[] = []

    if (type) {
      query += ' WHERE type = ?'
      params.push(type)
    }

    query += ' ORDER BY created_at DESC'

    const stmt = db.prepare(query)
    const favorites = stmt.all(...params) as (Omit<Favorite, 'content'> & { content: string })[]

    // Parse content JSON for each favorite
    const parsedFavorites = favorites.map(fav => ({
      ...fav,
      content: JSON.parse(fav.content),
    }))

    return NextResponse.json(parsedFavorites)
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    )
  }
}

// POST /api/favorites - Save new favorite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, content, source_session_id } = body

    if (!type || !content) {
      return NextResponse.json(
        { error: 'type and content are required' },
        { status: 400 }
      )
    }

    if (!['hook', 'cta', 'body', 'visual', 'template'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      )
    }

    const id = generateId()
    const contentStr = typeof content === 'string' ? JSON.stringify(content) : JSON.stringify(content)
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO favorites (id, type, content, source_session_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(id, type, contentStr, source_session_id || null, now)

    const newFavorite: Favorite = {
      id,
      type,
      content,
      source_session_id: source_session_id || null,
      created_at: now,
    }

    return NextResponse.json(newFavorite, { status: 201 })
  } catch (error) {
    console.error('Error creating favorite:', error)
    return NextResponse.json(
      { error: 'Failed to create favorite' },
      { status: 500 }
    )
  }
}
