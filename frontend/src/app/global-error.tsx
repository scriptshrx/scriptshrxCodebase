'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{
                    display: 'flex',
                    height: '100vh',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontFamily: 'sans-serif',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <h1>Critical System Error</h1>
                    <p>The application encountered a critical error and cannot render.</p>

                    {/* Native button element only - NO custom components */}
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '10px 20px',
                            cursor: 'pointer',
                            backgroundColor: 'black',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px'
                        }}
                    >
                        Reload Application
                    </button>
                </div>
            </body>
        </html>
    );
}
