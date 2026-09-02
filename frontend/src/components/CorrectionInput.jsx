// import LoadingDots from './LoadingDots.jsx';

// // The "what would you change?" input shown when refining a drink. Controlled
// // input — parent owns the value. Shows animated feedback while refining.
// export default function CorrectionInput({ correction, onChange, onSubmit, onCancel, refining }) {
//   return (
//     <div>
//       <p className="section-label">What would you change?</p>
//       <textarea
//         className="brief-input"
//         placeholder="e.g. too sweet, a little more lime"
//         value={correction}
//         onChange={(e) => onChange(e.target.value)}
//       />
//       <div className="stack" style={{ marginTop: 'var(--sp-3)' }}>
//         <button
//           className="button"
//           onClick={onSubmit}
//           disabled={!correction.trim() || refining}
//         >
//           {refining ? <LoadingDots label="Refining" /> : 'Refine it'}
//         </button>
//         <button className="button secondary" onClick={onCancel} disabled={refining}>
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }