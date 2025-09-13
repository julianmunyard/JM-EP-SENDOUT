'use client'

import { useState } from 'react'

export default function SupportLetterBox() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Preview box */}
      <div
        onClick={() => setIsOpen(true)}
        style={{
          marginTop: '60px',
          marginBottom: '40px',
          padding: '16px 24px',
          border: '1px solid #000',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          backgroundColor: '#FCFAEE',
          color: '#000',
          maxWidth: 'fit-content',
        }}
      >
        📄 Letter of Support from KESMAR
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '700px',
              backgroundColor: '#FCFAEE',
              padding: '40px',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#000',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              overflowY: 'auto',
              maxHeight: '90vh',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              ×
            </button>

            <p style={{ marginBottom: '24px' }}><strong>To The ArtsPay Foundation Panel,</strong></p>

<p style={{ marginBottom: '24px' }}>
  I’m writing in support of Julian Munyard’s application for Act Two: No Fuss Funding – to complete and release his upcoming EP project.
</p>

            <p style={{ marginBottom: '24px' }}>
              As both a collaborator and close creative peer, I’ve had the opportunity to watch Julian develop this project with deep care, originality, and a clear artistic vision.
            </p>

            <p style={{ marginBottom: '24px' }}>
                I’ve been mixing the record in-kind because I genuinely believe in the music and what he’s building. The songs are strong, the vision is clear, and I’m excited to bring my own skills and studio setup into the fold to help finish it.
            </p>

            <p style={{ marginBottom: '24px' }}>
              This funding would go a long way in helping Julian do justice to the work he’s already created — and I strongly encourage The ArtsPay Foundation to support his vision.
            </p>

            <p style={{ marginTop: '24px' }}>
              Warm regards,<br />
              <strong>KESMAR</strong><br />
              Songwriter, Producer & Engineer
            </p>
          </div>
        </div>
      )}
    </>
  )
}
