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
      <Tooltip title="Siga no Instagram">
        <IconButton
          aria-label="Siga no Instagram (abre em nova aba)"
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

      <Tooltip title="Siga no X">
        <IconButton
          aria-label="Siga no X (abre em nova aba)"
          size={size}
          color={color}
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: "#FFFFFF",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "scale(1.1)",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
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