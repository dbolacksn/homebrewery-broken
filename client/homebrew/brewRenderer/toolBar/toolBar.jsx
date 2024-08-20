require('./toolBar.less');
const React = require('react');
const { useState, useEffect } = React;
const _ = require('lodash')

const MAX_ZOOM = 300;
const MIN_ZOOM = 10;

const ToolBar = ({ onZoomChange, currentPage, onPageChange, totalPages })=>{

	const [zoomLevel, setZoomLevel] = useState(100);
	const [pageInput, setPageInput] = useState(currentPage);

	useEffect(()=>{
		onZoomChange(zoomLevel);
	}, [zoomLevel]);

	useEffect(()=>{
		setPageInput(currentPage);
	}, [currentPage])

	const handleZoomChange = (delta)=>{
		const zoomChange = _.clamp(zoomLevel + delta, MIN_ZOOM, MAX_ZOOM);

		setZoomLevel(zoomChange);
	};

	const handlePageChange = (page)=>{
		setPageInput((page));
	}

	return (
		<div className='toolBar'>
			<div className='tool'>
				<button
					onClick={()=>handleZoomChange(-20)}
					disabled={zoomLevel <= MIN_ZOOM}
				>
					<i className='fas fa-magnifying-glass-minus' />
				</button>
			</div>
			<div className='tool'>
				<input
					className='slider'
					type='range'
					name='zoom'
					list='zoomLevels'
					min={MIN_ZOOM}
					max={MAX_ZOOM}
					step='1'
					value={zoomLevel}
					onChange={(e)=>{setZoomLevel(parseInt(e.target.value));}}
				/>
				<datalist id='zoomLevels'>
					<option value='100' />
				</datalist>
			</div>

			<div className='tool'>
				<button
					onClick={()=>handleZoomChange(20)}
					disabled={zoomLevel >= MAX_ZOOM}
				>
					<i className='fas fa-magnifying-glass-plus' />
				</button>
			</div>
			<div className='tool'>
				<button
					className='previousPage'
					onClick={()=>{
						console.log(`page is ${state.currentPage}`);
						onPageChange(state.currentPage - 2);
					}}
					disabled={state.currentPage <= 1}
				>
					<i className='fas fa-arrow-left'></i>
				</button>
			</div>

			<input
				type='number'
				name='page'
				min={1}
				max={state.totalPages}
				id='pageInput'
				value={pageInput}
				onChange={(e)=>{
					handlePageChange(e.target.value == false ? e.target.value : parseInt(e.target.value));}}
				onBlur={()=>onPageChange(pageInput)}
			/>

			<div className='tool'>
				<button
					className='nextPage'
					onClick={()=>{
						console.log(
							`page is ${state.currentPage} and i move to ${state.currentPage}`
						);
						onPageChange(state.currentPage);
					}}
					disabled={state.currentPage >= state.totalPages}
				>
					<i className='fas fa-arrow-right'></i>
				</button>
			</div>
		</div>
	);
};

module.exports = ToolBar;
