'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Root Error Boundary caught:', error)
    }, [error])

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center',
            fontFamily: 'sans-serif'
        }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a202c', marginBottom: '10px' }}>Something went wrong!</h2>
            <p style={{ color: '#4a5568', marginBottom: '20px' }}>We encountered an unexpected error on this page.</p>
            <button
                onClick={() => reset()}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#1a202c',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                Try again
            </button>
        </div>
    )
}
