/**
 * @file This shows how, when using the segments mode of SourceBuffer, and appending disparate files, you need to manage offsets yourself
 */

(async () => {
	const videoElement = document.querySelector('video');
	const vidClips = [
		'http://localhost/video/init.mp4',
		'http://localhost/video/video0.m4s',
	];
	// Shuffle clips. If you reload the page, you will get a random order of videos!
	//shuffleArr(vidClips);

	// For `sourceBuffer.mode = 'segments'`, we have to be careful with multiple
	// videos. Segments means that browser will try to sniff timestamps from
	// the files. In our case, we are using completely separate files, without
	// timeline info. So, we need to compute the duration of each, and then use
	// that later to manually offset each chunk from the previous

	/**
	 * @typedef {{url: string, duration: number, buff: ArrayBuffer}} ClipToAppend
	 */
	/** @type {ClipToAppend[]} */
	const clipsToAppend = await Promise.all(
		vidClips.map(async (vidUrl) => {
			const blob = await (await fetch(vidUrl)).blob();
			const duration = await getDuration(blob);
			const buff = await blob.arrayBuffer();
			return {
				url: vidUrl,
				duration,
				buff
			};
		})
	);

	// Normal setup, with MediaSource, Object URL, and prepped SourceBuffer
	const mediaSource = new MediaSource();
	videoElement.src = URL.createObjectURL(mediaSource);
	// mode = segments
	//const sourceBuffer = await addSourceBufferWhenOpen(mediaSource, `video/webm; codecs="vp8,vorbis"`, 'segments');
	const sourceBuffer = await addSourceBufferWhenOpen(mediaSource, 'video/mp4; codecs="avc1.42001e, opus"', 'segments');

	/**
	 * Pointer to last vid appended out of source list
	 */
	let clipIndex = 0;
	sourceBuffer.onupdateend = () => {
		if (clipIndex < clipsToAppend.length - 1) {
			// We have another segment to add
			// BUT, first we need to offset the time by the duration of
			// the previously appended clip. Otherwise it will overwrite it
			sourceBuffer.timestampOffset += clipsToAppend[clipIndex].duration;
			// Now we can move on to next clip and append it
			clipIndex++;
			sourceBuffer.appendBuffer(clipsToAppend[clipIndex].buff);
		} else {
			// Done!
			mediaSource.endOfStream();
			videoElement.play();
		}
	};

	// This will kick off event listener chain above
	sourceBuffer.appendBuffer(clipsToAppend[clipIndex].buff);

	// Debug Info
	console.log({
		sourceBuffer,
		mediaSource,
		videoElement
	});
})();
