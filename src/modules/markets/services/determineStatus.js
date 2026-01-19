function determineStatus(marketBook, match) {
    // Check if market is in play
    if (marketBook.inplay === true) {
        return {
            status: 'in_play',
            result: null
        }
    }

    // Check if market is closed/suspended and past start time
    if (['CLOSED', 'SUSPENDED'].includes(marketBook.status)) {
        const eventTime = new Date(match.eventDateTime);
        const now = new Date();

        // If 3+ hours past start time and not in play, likely completed
        if (now.getTime() - eventTime.getTime() > 3 * 60 * 60 * 1000) {
            return {
                status: 'completed',
                result: marketBook.status
            }
        }
    }

    // Check if market is settled
    if (marketBook.status === 'SETTLED') {
        return {
            status: 'completed',
            result: marketBook.status
        }
    }

    // Check runners status
    const hasWinner = marketBook.runners?.find(r => r.status === 'WINNER');
    if (hasWinner) {
        return {
            status: 'completed',
            result: hasWinner
        }
    }

    // If market is OPEN and past start time, it's active (pre-match)
    if (marketBook.status === 'OPEN') {
        const eventTime = new Date(match.eventDateTime);
        const now = new Date();

        if (now >= eventTime) {
            // Past start time but not in play yet - keep as active
            return {
                status: 'active',
                result: ""
            }
        }
    }

    // Default to current status
    return {
        status: match.status,
        result: hasWinner.winner
    }
}