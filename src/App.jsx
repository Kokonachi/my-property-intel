import { useEffect, useState } from 'react'
import MapPage from './pages/MapPage.jsx'
import RealDetailPage from './pages/RealDetailPage.jsx'
import LaunchHome from './pages/LaunchHome.jsx'
import LaunchExplore from './pages/LaunchExplore.jsx'
import LaunchDetail from './pages/LaunchDetail.jsx'
import { realById } from './data/real.js'
import { launchById } from './data/launches.js'
import { OnboardingHost } from './components/HolderSheet.jsx'

function useHash() {
  const [h, setH] = useState(window.location.hash || '#/')
  useEffect(() => {
    const on = () => setH(window.location.hash || '#/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return h
}

export default function App() {
  const hash = useHash()
  const property = hash.match(/^#\/property\/([^/?]+)/)
  const launch = hash.match(/^#\/launch\/([^/?]+)/)
  const explore = hash.match(/^#\/explore(?:\/([^/?]+))?\/?$/)
  const isMap = hash === '#/map' || hash.startsWith('#/map?')
  useEffect(() => { window.scrollTo(0, 0) }, [hash])

  let page = <LaunchHome />
  if (property) {
    const id = decodeURIComponent(property[1])
    const rp = realById(id)
    if (rp) page = <RealDetailPage key={rp.id} p={rp} />
    else { window.location.replace('#/'); return null }
  } else if (launch) {
    const id = decodeURIComponent(launch[1])
    const p = launchById(id)
    if (p) page = <LaunchDetail key={p.id} p={p} />
    else { window.location.replace('#/'); return null }
  } else if (explore) {
    const id = explore[1] ? decodeURIComponent(explore[1]) : null
    page = <LaunchExplore focusId={id} />
  } else if (isMap) {
    page = <MapPage />
  }
  return (
    <>
      {page}
      <OnboardingHost />
    </>
  )
}
