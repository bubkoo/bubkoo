exports.getDate = function () {
    const pad = (m) => m > 9 ? `${m}` : `0${m}`
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = pad(now.getMonth() + 1)
    const dd = pad(now.getDate())
    return `${yyyy}-${mm}-${dd}`
}
