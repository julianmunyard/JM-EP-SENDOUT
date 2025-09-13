'use client'

import { useEffect, useRef } from 'react'

export default function InstagramEmbed() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    ref.current.innerHTML = `
      <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/reel/C8jY0FmSVVo/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15); margin:1px auto; max-width:540px; min-width:326px; padding:0; width:99.375%;">
      </blockquote>
    `

    const script = document.createElement('script')
    script.src = '//www.instagram.com/embed.js'
    script.async = true
    ref.current.appendChild(script)
  }, [])

  return <div ref={ref} style={{ margin: '20px 0' }} />
}
