import { useId, useState, type CSSProperties } from "react";
import {
  defaultAssignmentOptionColor,
  normalizeAssignmentOptionColor,
  type AssignmentOptionColor
} from "../shared/option-colors";

interface HslColor {
  hue: number;
  saturation: number;
  lightness: number;
}

interface OptionColorPickerProps {
  label: string;
  value?: AssignmentOptionColor;
  onChange: (color?: AssignmentOptionColor) => void;
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function hexToHsl(hex: string): HslColor {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;

  if (delta > 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    if (maximum === blue) hue = 60 * ((red - green) / delta + 4);
  }

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return {
    hue: Math.round(hue < 0 ? hue + 360 : hue),
    saturation: Math.round(saturation * 100),
    lightness: Math.round(lightness * 100)
  };
}

function hslToHex({ hue, saturation, lightness }: HslColor): AssignmentOptionColor {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = saturation / 100;
  const normalizedLightness = lightness / 100;
  const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const secondary = chroma * (1 - Math.abs((normalizedHue / 60) % 2 - 1));
  const offset = normalizedLightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (normalizedHue < 60) [red, green] = [chroma, secondary];
  else if (normalizedHue < 120) [red, green] = [secondary, chroma];
  else if (normalizedHue < 180) [green, blue] = [chroma, secondary];
  else if (normalizedHue < 240) [green, blue] = [secondary, chroma];
  else if (normalizedHue < 300) [red, blue] = [secondary, chroma];
  else [red, blue] = [chroma, secondary];

  const channel = (value: number) =>
    Math.round((value + offset) * 255).toString(16).padStart(2, "0");
  return normalizeAssignmentOptionColor(`#${channel(red)}${channel(green)}${channel(blue)}`);
}

export function OptionColorPicker({ label, value, onChange }: OptionColorPickerProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [hsl, setHsl] = useState<HslColor>(() => hexToHsl(value ?? defaultAssignmentOptionColor));
  const [hex, setHex] = useState(value ?? defaultAssignmentOptionColor);
  const validHex = HEX_COLOR_PATTERN.test(hex);
  const previewColor = validHex ? normalizeAssignmentOptionColor(hex) : hslToHex(hsl);

  function openPicker() {
    const initial = value ?? defaultAssignmentOptionColor;
    setHsl(hexToHsl(initial));
    setHex(initial);
    setOpen(true);
  }

  function updateHsl(patch: Partial<HslColor>) {
    setHsl((current) => {
      const next = { ...current, ...patch };
      setHex(hslToHex(next));
      return next;
    });
  }

  function updateHex(next: string) {
    const normalized = next.toUpperCase();
    setHex(normalized);
    if (HEX_COLOR_PATTERN.test(normalized)) setHsl(hexToHsl(normalized));
  }

  return (
    <div className="option-color">
      <span>Color <span className="muted">(optional)</span></span>
      {!open && (
        <div className="option-color__summary">
          {value && (
            <>
              <span
                className="option-color-swatch option-color-swatch--large"
                style={{ "--option-color": value } as CSSProperties}
                aria-hidden="true"
              />
              <code>{value}</code>
            </>
          )}
          <button
            type="button"
            className="button button--secondary button--small"
            aria-expanded="false"
            aria-controls={panelId}
            aria-label={`${value ? "Change" : "Add"} color for ${label}`}
            onClick={openPicker}
          >
            {value ? "Change" : "Add color"}
          </button>
          {value && (
            <button
              type="button"
              className="text-button"
              aria-label={`Remove color for ${label}`}
              onClick={() => onChange(undefined)}
            >
              Remove color
            </button>
          )}
        </div>
      )}
      {open && (
        <section id={panelId} className="color-picker" aria-label={`${label} color picker`}>
          <div className="color-picker__heading">
            <div>
              <strong>Choose a color</strong>
              <p className="muted">Adjust the sliders or enter a hex value.</p>
            </div>
            <span
              className="color-picker__preview"
              style={{ backgroundColor: previewColor }}
              role="img"
              aria-label={`Preview ${previewColor}`}
            />
          </div>
          <label className="color-picker__range">
            <span>Hue <span className="color-picker__value" aria-hidden="true">{hsl.hue} deg</span></span>
            <input
              type="range"
              min="0"
              aria-label="Hue"
              autoFocus
              max="359"
              value={hsl.hue}
              onChange={(event) => updateHsl({ hue: Number(event.target.value) })}
              style={{ "--range-background": "linear-gradient(to right, #C63D4F, #D1A51B, #39845B, #3677B3, #7C55A5, #C63D4F)" } as CSSProperties}
            />
          </label>
          <label className="color-picker__range">
            <span>Saturation <span className="color-picker__value" aria-hidden="true">{hsl.saturation}%</span></span>
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.saturation}
              aria-label="Saturation"
              onChange={(event) => updateHsl({ saturation: Number(event.target.value) })}
              style={{ "--range-background": `linear-gradient(to right, hsl(${hsl.hue} 0% ${hsl.lightness}%), hsl(${hsl.hue} 100% ${hsl.lightness}%))` } as CSSProperties}
            />
          </label>
          <label className="color-picker__range">
            <span>Lightness <span className="color-picker__value" aria-hidden="true">{hsl.lightness}%</span></span>
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.lightness}
              onChange={(event) => updateHsl({ lightness: Number(event.target.value) })}
              style={{ "--range-background": `linear-gradient(to right, #000, hsl(${hsl.hue} ${hsl.saturation}% 50%), #fff)` } as CSSProperties}
              aria-label="Lightness"
            />
          </label>
          <label className="color-picker__hex">
            <span>Hex color</span>
            <input
              value={hex}
              maxLength={7}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!validHex}
              onChange={(event) => updateHex(event.target.value)}
            />
          </label>
          {!validHex && <p className="error" role="alert">Enter a six-digit color such as #39845B.</p>}
          <div className="color-picker__actions">
            <button type="button" className="button button--secondary button--small" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary button--small"
              disabled={!validHex}
              onClick={() => {
                onChange(normalizeAssignmentOptionColor(hex));
                setOpen(false);
              }}
            >
              Apply color
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
