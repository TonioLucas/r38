import { Stack, IconButton, Tooltip } from "@mui/material";
import { Instagram as InstagramIcon } from "@mui/icons-material";
import XIcon from "../icons/XIcon";

interface SocialMediaIconsProps {
  instagramUrl: string;
  xUrl: string;
  size?: "small" | "medium" | "large";
  color?: "primary" | "inherit" | "default";
  spacing?: number;
}

export function SocialMediaIcons({
  instagramUrl,
  xUrl,
  size = "large",
  color = "inherit",
  spacing = 2
}: SocialMediaIconsProps) {
  return (
    <Stack direction="row" spacing={spacing} justifyContent="center" alignItems="center">
      <Tooltip title="Siga-nos no Instagram">
        <IconButton
          aria-label="Siga-nos no Instagram (abre em nova aba)"
          size={size}
          color={color}
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: "#E4405F",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "scale(1.1)",
              backgroundColor: "rgba(228, 64, 95, 0.08)",
            },
          }}
        >
          <InstagramIcon fontSize={size} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Siga-nos no X">
        <IconButton
          aria-label="Siga-nos no X (abre em nova aba)"
          size={size}
          color={color}
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: (theme) => theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
            transition: "transform 0.2s",
            "&:hover": {
              transform: "scale(1.1)",
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.04)",
            },
          }}
        >
          <XIcon fontSize={size} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default SocialMediaIcons;