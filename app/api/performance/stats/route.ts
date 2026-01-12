import { NextResponse } from 'next/server'
import db from '@/lib/db'

interface PerformanceNote {
  id: string
  session_id: string
  views: number | null
  likes: number | null
  comments: number | null
  reposts: number | null
  notes: string
  recorded_at: string
}

interface AggregateStats {
  total_published: number
  sessions_with_metrics: number
  totals: {
    views: number
    likes: number
    comments: number
    reposts: number
  }
  averages: {
    views: number
    likes: number
    comments: number
    reposts: number
  }
  best_performing: {
    by_views: { session_id: string; title: string; value: number } | null
    by_likes: { session_id: string; title: string; value: number } | null
    by_comments: { session_id: string; title: string; value: number } | null
    by_reposts: { session_id: string; title: string; value: number } | null
  }
}

// GET /api/performance/stats - Get aggregate performance statistics
export async function GET() {
  try {
    // Get count of published sessions
    const publishedCountStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sessions WHERE status = 'published'
    `)
    const { count: totalPublished } = publishedCountStmt.get() as { count: number }

    // Get all performance notes with session titles (only for published sessions)
    const notesStmt = db.prepare(`
      SELECT pn.*, s.title
      FROM performance_notes pn
      JOIN sessions s ON pn.session_id = s.id
      WHERE s.status = 'published'
    `)
    const notes = notesStmt.all() as (PerformanceNote & { title: string })[]

    // Calculate totals
    let totalViews = 0
    let totalLikes = 0
    let totalComments = 0
    let totalReposts = 0
    let viewsCount = 0
    let likesCount = 0
    let commentsCount = 0
    let repostsCount = 0

    // Track best performing
    let bestByViews: { session_id: string; title: string; value: number } | null = null
    let bestByLikes: { session_id: string; title: string; value: number } | null = null
    let bestByComments: { session_id: string; title: string; value: number } | null = null
    let bestByReposts: { session_id: string; title: string; value: number } | null = null

    for (const note of notes) {
      if (note.views !== null) {
        totalViews += note.views
        viewsCount++
        if (!bestByViews || note.views > bestByViews.value) {
          bestByViews = { session_id: note.session_id, title: note.title, value: note.views }
        }
      }
      if (note.likes !== null) {
        totalLikes += note.likes
        likesCount++
        if (!bestByLikes || note.likes > bestByLikes.value) {
          bestByLikes = { session_id: note.session_id, title: note.title, value: note.likes }
        }
      }
      if (note.comments !== null) {
        totalComments += note.comments
        commentsCount++
        if (!bestByComments || note.comments > bestByComments.value) {
          bestByComments = { session_id: note.session_id, title: note.title, value: note.comments }
        }
      }
      if (note.reposts !== null) {
        totalReposts += note.reposts
        repostsCount++
        if (!bestByReposts || note.reposts > bestByReposts.value) {
          bestByReposts = { session_id: note.session_id, title: note.title, value: note.reposts }
        }
      }
    }

    const stats: AggregateStats = {
      total_published: totalPublished,
      sessions_with_metrics: notes.length,
      totals: {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        reposts: totalReposts,
      },
      averages: {
        views: viewsCount > 0 ? Math.round((totalViews / viewsCount) * 10) / 10 : 0,
        likes: likesCount > 0 ? Math.round((totalLikes / likesCount) * 10) / 10 : 0,
        comments: commentsCount > 0 ? Math.round((totalComments / commentsCount) * 10) / 10 : 0,
        reposts: repostsCount > 0 ? Math.round((totalReposts / repostsCount) * 10) / 10 : 0,
      },
      best_performing: {
        by_views: bestByViews,
        by_likes: bestByLikes,
        by_comments: bestByComments,
        by_reposts: bestByReposts,
      },
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching performance stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance stats' },
      { status: 500 }
    )
  }
}
