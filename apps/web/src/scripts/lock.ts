// Lock screen — 4-digit PIN entry

const PIN_STORAGE_KEY = 'warren:pin'
const MAX_PIN_LENGTH = 4

export function initLock(onUnlock: () => void): void {
  const lockScreen = document.getElementById('lock-screen')!
  const errorEl = document.getElementById('lock-error')!
  const dots = Array.from({ length: MAX_PIN_LENGTH }, (_, i) => document.getElementById(`dot-${i}`)!)
  const keyBtns = document.querySelectorAll<HTMLButtonElement>('.key-btn')

  const savedPin = localStorage.getItem(PIN_STORAGE_KEY)

  // No PIN set — skip lock screen entirely
  if (!savedPin) {
    lockScreen.classList.add('hidden')
    return
  }

  let entered = ''

  function updateDots(): void {
    for (let i = 0; i < MAX_PIN_LENGTH; i++) {
      dots[i]?.classList.toggle('filled', i < entered.length)
    }
  }

  function showError(): void {
    errorEl.classList.remove('hidden')
    // Shake animation
    lockScreen.style.animation = 'none'
    requestAnimationFrame(() => {
      lockScreen.style.animation = ''
    })
    setTimeout(() => errorEl.classList.add('hidden'), 1500)
  }

  async function checkPin(): Promise<void> {
    const hash = await hashPin(entered)
    if (hash === savedPin) {
      lockScreen.classList.add('hidden')
      onUnlock()
    } else {
      entered = ''
      updateDots()
      showError()
    }
  }

  function handleDigit(digit: string): void {
    if (digit === 'clear') {
      entered = entered.slice(0, -1)
      updateDots()
      return
    }

    if (entered.length >= MAX_PIN_LENGTH) return

    entered += digit
    updateDots()

    if (entered.length === MAX_PIN_LENGTH) {
      setTimeout(() => checkPin(), 50)
    }
  }

  for (const btn of keyBtns) {
    const digit = btn.dataset.digit
    if (!digit) continue
    btn.addEventListener('click', () => handleDigit(digit))
  }
}

/**
 * Save a PIN (hashed) to localStorage.
 * Call this when the user sets a new PIN.
 */
export async function savePin(pin: string): Promise<void> {
  const hash = await hashPin(pin)
  localStorage.setItem(PIN_STORAGE_KEY, hash)
}

/**
 * Remove the PIN lock.
 */
export function clearPin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY)
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`warren-pin:${pin}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
